const Asana = require('asana');
import { ITimeTrackingBackend, TimeEntry, TaskTimeStats } from '../core/time-tracking-backend';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the ITimeTrackingBackend interface.
 *
 * Uses Asana stories to track time entries. Each time entry is stored
 * as a story with a special format that includes the duration and optional notes.
 */
export class AsanaTimeTrackingBackend extends AsanaBackendBase implements ITimeTrackingBackend {
  private storiesApi: any;
  private tasksApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.storiesApi = new Asana.StoriesApi();
    this.tasksApi = new Asana.TasksApi();
  }

  async logTime(taskId: string, durationMinutes: number, notes?: string): Promise<TimeEntry> {
    try {
      if (durationMinutes <= 0) {
        throw new Error('Duration must be greater than 0 minutes');
      }

      // Format the story text with time tracking marker
      const timeText = this.formatDuration(durationMinutes);
      const storyText = notes
        ? `[TIME_ENTRY:${durationMinutes}] ${timeText} - ${notes}`
        : `[TIME_ENTRY:${durationMinutes}] ${timeText}`;

      const result = await this.storiesApi.createStoryForTask(
        { data: { text: storyText } },
        taskId
      );

      return this.mapToTimeEntry(result.data, taskId);
    } catch (error) {
      throw new Error(`Failed to log time: ${error}`);
    }
  }

  async logTimeWithDuration(taskId: string, duration: string, notes?: string): Promise<TimeEntry> {
    const minutes = this.parseDuration(duration);
    return await this.logTime(taskId, minutes, notes);
  }

  async listTimeEntries(taskId: string): Promise<TimeEntry[]> {
    try {
      const result = await this.storiesApi.getStoriesForTask(taskId, {
        opt_fields: 'gid,text,created_at,created_by.name',
      });

      // Filter for stories that are time entries
      const timeEntries = result.data
        .filter((story: any) => story.text && story.text.includes('[TIME_ENTRY:'))
        .map((story: any) => this.mapToTimeEntry(story, taskId));

      return timeEntries;
    } catch (error) {
      throw new Error(`Failed to list time entries: ${error}`);
    }
  }

  async getTaskTimeStats(taskId: string): Promise<TaskTimeStats> {
    try {
      const [entries, taskResult] = await Promise.all([
        this.listTimeEntries(taskId),
        this.tasksApi.getTask(taskId, { opt_fields: 'gid,name' })
      ]);

      const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);

      return {
        taskGid: taskId,
        taskName: taskResult.data.name,
        totalMinutes,
        totalFormatted: this.formatDuration(totalMinutes),
        entryCount: entries.length,
        entries,
      };
    } catch (error) {
      throw new Error(`Failed to get task time stats: ${error}`);
    }
  }

  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    try {
      await this.storiesApi.deleteStory(timeEntryId);
    } catch (error) {
      throw new Error(`Failed to delete time entry: ${error}`);
    }
  }

  async getMultipleTaskTimeStats(taskIds: string[]): Promise<TaskTimeStats[]> {
    try {
      const statsPromises = taskIds.map(taskId => this.getTaskTimeStats(taskId));
      return await Promise.all(statsPromises);
    } catch (error) {
      throw new Error(`Failed to get multiple task time stats: ${error}`);
    }
  }

  // Helper methods

  private mapToTimeEntry(story: any, taskGid: string): TimeEntry {
    // Extract duration from the story text
    const match = story.text.match(/\[TIME_ENTRY:(\d+)\]/);
    const durationMinutes = match ? parseInt(match[1], 10) : 0;

    // Extract notes (text after the duration marker)
    let notes: string | undefined;
    const notesMatch = story.text.match(/\[TIME_ENTRY:\d+\]\s+(?:\d+h\s*)?(?:\d+m\s*)?-\s*(.+)/);
    if (notesMatch) {
      notes = notesMatch[1].trim();
    }

    return {
      gid: story.gid,
      taskGid,
      durationMinutes,
      createdAt: story.created_at,
      createdBy: story.created_by?.name,
      notes,
    };
  }

  /**
   * Formats duration in minutes to "Xh Ym" format.
   */
  private formatDuration(minutes: number): string {
    if (minutes === 0) return '0m';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }

  /**
   * Parses a duration string (e.g., "2h", "30m", "1h30m") to minutes.
   */
  private parseDuration(duration: string): number {
    const trimmed = duration.trim().toLowerCase();

    // Match patterns like "2h30m", "2h 30m", "2h", "30m", "90m"
    const hourMinMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?$/);
    if (hourMinMatch) {
      const hours = parseFloat(hourMinMatch[1]);
      const mins = parseFloat(hourMinMatch[2]);
      return Math.round(hours * 60 + mins);
    }

    const hourMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/);
    if (hourMatch) {
      return Math.round(parseFloat(hourMatch[1]) * 60);
    }

    const minMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?$/);
    if (minMatch) {
      return Math.round(parseFloat(minMatch[1]));
    }

    // Try parsing as just a number (assume minutes)
    const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
    if (numMatch) {
      return Math.round(parseFloat(numMatch[1]));
    }

    throw new Error(`Invalid duration format: ${duration}. Use formats like "2h", "30m", "1h30m", or "90"`);
  }
}
