import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { ITimeTrackingBackend, TimeEntry, TaskTimeStats } from '../core/time-tracking-backend';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the ITimeTrackingBackend interface.
 *
 * Provides time tracking operations for tasks, storing time entries
 * in a local JSONL file with aggregation and reporting capabilities.
 */
export class LocalTimeTrackingBackend extends LocalBackendBase implements ITimeTrackingBackend {
  private storage: JsonlRowStorage<TimeEntry>;
  private timeEntriesFile: string;
  private taskBackend: LocalTaskBackend;
  private initialized: boolean = false;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);

    this.storage = new JsonlRowStorage<TimeEntry>();
    this.timeEntriesFile = path.join(
      this.basePath,
      this.projectId,
      'time-entries.jsonl'
    );

    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.timeEntriesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async logTime(taskId: string, durationMinutes: number, notes?: string): Promise<TimeEntry> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      await this.taskBackend.getTask(taskId);

      const timeEntry: TimeEntry = {
        gid: uuidv4(),
        taskGid: taskId,
        durationMinutes,
        notes,
        createdAt: new Date().toISOString(),
      };

      await this.storage.appendRows(this.timeEntriesFile, [timeEntry]);

      return timeEntry;
    } catch (error) {
      throw new Error(`Failed to log time: ${error}`);
    }
  }

  async logTimeWithDuration(taskId: string, duration: string, notes?: string): Promise<TimeEntry> {
    await this.ensureInitialized();

    try {
      const durationMinutes = this.parseDuration(duration);
      return await this.logTime(taskId, durationMinutes, notes);
    } catch (error) {
      throw new Error(`Failed to log time with duration: ${error}`);
    }
  }

  async listTimeEntries(taskId: string): Promise<TimeEntry[]> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      await this.taskBackend.getTask(taskId);

      if (!fs.existsSync(this.timeEntriesFile)) {
        return [];
      }

      const allEntries = await this.storage.readAll(this.timeEntriesFile);
      return allEntries.filter(entry => entry.taskGid === taskId);
    } catch (error) {
      throw new Error(`Failed to list time entries: ${error}`);
    }
  }

  async getTaskTimeStats(taskId: string): Promise<TaskTimeStats> {
    await this.ensureInitialized();

    try {
      const task = await this.taskBackend.getTask(taskId);
      const entries = await this.listTimeEntries(taskId);

      const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);

      return {
        taskGid: taskId,
        taskName: task.name,
        totalMinutes,
        totalFormatted: this.formatDuration(totalMinutes),
        entryCount: entries.length,
        entries,
      };
    } catch (error) {
      throw new Error(`Failed to get task time stats: ${error}`);
    }
  }

  async getMultipleTaskTimeStats(taskIds: string[]): Promise<TaskTimeStats[]> {
    await this.ensureInitialized();

    try {
      const stats: TaskTimeStats[] = [];

      for (const taskId of taskIds) {
        try {
          const taskStats = await this.getTaskTimeStats(taskId);
          stats.push(taskStats);
        } catch (error) {
          // Skip tasks that don't exist or have errors
          continue;
        }
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get multiple task time stats: ${error}`);
    }
  }

  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.timeEntriesFile)) {
        throw new Error(`Time entry with ID ${timeEntryId} not found`);
      }

      const entries = await this.storage.readAll(this.timeEntriesFile);
      const filteredEntries = entries.filter(e => e.gid !== timeEntryId);

      if (filteredEntries.length === entries.length) {
        throw new Error(`Time entry with ID ${timeEntryId} not found`);
      }

      await this.storage.writeAll(this.timeEntriesFile, filteredEntries);
    } catch (error) {
      throw new Error(`Failed to delete time entry: ${error}`);
    }
  }

  /**
   * Parses a duration string (e.g., "2h", "30m", "1h30m") into minutes.
   */
  private parseDuration(duration: string): number {
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/(\d+)m/);

    let totalMinutes = 0;

    if (hoursMatch) {
      totalMinutes += parseInt(hoursMatch[1]) * 60;
    }

    if (minutesMatch) {
      totalMinutes += parseInt(minutesMatch[1]);
    }

    // If no h or m suffix, assume minutes
    if (!hoursMatch && !minutesMatch) {
      const numericValue = parseInt(duration);
      if (!isNaN(numericValue)) {
        totalMinutes = numericValue;
      }
    }

    if (totalMinutes === 0) {
      throw new Error(`Invalid duration format: ${duration}. Use formats like "2h", "30m", "1h30m", or "90"`);
    }

    return totalMinutes;
  }

  /**
   * Formats minutes into a human-readable duration string.
   */
  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }
}
