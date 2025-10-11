import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { DataLayer } from '@digital-minion/data/dist/layer/data.layer';
import { ITaskBackend } from '../core/task-backend';
import { Task } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';

/**
 * Local file-based implementation of the ITaskBackend interface.
 *
 * Uses the DataLayer with semantic partitioning strategy:
 * - Partitioned by completion status (state=complete/state=incomplete)
 * - Sub-partitioned by section (section=none/section=<name>)
 *
 * Structure:
 *   {basePath}/{teamName}/{projectName}/
 *     data/
 *       manifest.json
 *       state=incomplete/
 *         section=none/tasks.jsonl
 *         section=Marketing/tasks.jsonl
 *       state=complete/
 *         section=none/tasks.jsonl
 *         section=Engineering/tasks.jsonl
 */
export class LocalTaskBackend extends LocalBackendBase implements ITaskBackend {
  private dataLayer: DataLayer<Task>;
  private initialized: boolean = false;

  constructor(config: LocalConfig) {
    super(config);

    // Configure DataLayer with project path as base and "data" as collection
    // This creates: projectPath/data/manifest.json
    this.dataLayer = new DataLayer<Task>({
      basePath: this.getProjectPath(),
      collection: 'data',
      adapterType: this.getFormat(),
      enableCaching: this.config.enableCaching,
      autoDiscoverPartitions: this.config.autoDiscoverPartitions,
    });
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.dataLayer.initialize();
      this.initialized = true;
    }
  }

  /**
   * Determines the partition ID for a task based on completion and section.
   * Uses semantic naming: state=complete/state=incomplete and section=<name>/section=none
   */
  private getPartitionId(task: Task): string {
    const statePart = task.completed ? 'state=complete' : 'state=incomplete';
    const sectionPart = this.getSectionPartition(task);
    return `${statePart}/${sectionPart}`;
  }

  /**
   * Gets the section partition name for a task.
   * Uses semantic naming: section=<name> or section=none
   */
  private getSectionPartition(task: Task): string {
    if (task.memberships && task.memberships.length > 0) {
      const section = task.memberships[0].section;
      // Use section name if available, otherwise use section ID
      const sectionName = section.name || section.gid;
      return `section=${sectionName}`;
    }
    return 'section=none';
  }

  async listTasks(): Promise<Task[]> {
    await this.ensureInitialized();

    try {
      // Query all tasks across all partitions
      const result = await this.dataLayer.query({});
      return result.data;
    } catch (error) {
      throw new Error(`Failed to list tasks: ${error}`);
    }
  }

  async getTask(taskId: string): Promise<Task> {
    await this.ensureInitialized();

    try {
      // Query for specific task by GID across all partitions
      const result = await this.dataLayer.query({
        filters: { gid: taskId }
      });

      if (result.data.length === 0) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      return result.data[0];
    } catch (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  async createTask(
    name: string,
    notes?: string,
    dueOn?: string,
    priority?: string,
    isMilestone?: boolean
  ): Promise<Task> {
    await this.ensureInitialized();

    try {
      const newGid = uuidv4();
      console.log(`\n[CREATE TASK] Creating task "${name}" with GID: ${newGid}`);

      const task: Task = {
        gid: newGid,
        name,
        notes,
        completed: false,
        dueOn,
        priority: priority as 'low' | 'medium' | 'high' | undefined,
        isMilestone,
        tags: priority ? [`priority:${priority}`] : [],
      };

      // Determine partition and ensure it exists
      const partitionId = this.getPartitionId(task);
      await this.ensurePartitionExists(partitionId);

      console.log(`[CREATE TASK] Inserting to partition: ${partitionId}`);
      // Insert task into partition
      await this.dataLayer.insert([task], partitionId);

      console.log(`[CREATE TASK] Successfully created task with GID: ${newGid}`);
      return task;
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  /**
   * Ensures a partition exists by adding it to the manifest.
   */
  private async ensurePartitionExists(partitionId: string): Promise<void> {
    // Get manifest to check if partition exists
    const manifest = (this.dataLayer as any).manifestManager.getManifest();

    if (!manifest.partitions[partitionId]) {
      // Add partition to manifest (using absolute path with forward slashes for cross-platform compatibility)
      const partitionPath = path.join(this.getDataPath(), partitionId, `tasks.${this.getFormat()}`).replace(/\\/g, '/');
      await (this.dataLayer as any).manifestManager.addPartition({
        id: partitionId,
        name: partitionId,
        type: 'file',
        location: partitionPath,
      });
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    await this.ensureInitialized();

    try {
      // Get existing task
      const existingTask = await this.getTask(taskId);

      // Handle priority updates via tags
      if (updates.priority !== undefined) {
        const tags = existingTask.tags || [];
        const filteredTags = tags.filter(t => !t.startsWith('priority:'));

        if (updates.priority) {
          filteredTags.push(`priority:${updates.priority}`);
        }

        updates.tags = filteredTags;
      }

      // Apply updates
      const updatedTask = { ...existingTask, ...updates };

      // Check if partition changed (completion status or section)
      const oldPartitionId = this.getPartitionId(existingTask);
      const newPartitionId = this.getPartitionId(updatedTask);

      if (oldPartitionId !== newPartitionId) {
        // Task needs to move to a different partition
        // Ensure new partition exists
        await this.ensurePartitionExists(newPartitionId);

        // Delete from SPECIFIC old partition (not all partitions)
        const oldPartition = (this.dataLayer as any).manifestManager.getPartition(oldPartitionId);
        if (oldPartition) {
          const deleteCount = await (this.dataLayer as any).writeService.deleteFromPartition(oldPartition, { gid: taskId });
        }

        // Insert to new partition
        await this.dataLayer.insert([updatedTask], newPartitionId);

        // Clear cache after the move
        this.dataLayer.clearCache();
      } else {
        // Update in same partition
        await this.dataLayer.update({ gid: taskId }, updates);
      }

      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Delete task from any partition it's in
      const deletedCount = await this.dataLayer.delete({ gid: taskId });

      if (deletedCount === 0) {
        throw new Error(`Task with ID ${taskId} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete task: ${error}`);
    }
  }

  async completeTask(taskId: string): Promise<Task> {
    return this.updateTask(taskId, { completed: true });
  }

  async assignToUser(taskId: string, userGid: string): Promise<Task> {
    return this.updateTask(taskId, { assigneeGid: userGid });
  }

  async unassignTask(taskId: string): Promise<Task> {
    return this.updateTask(taskId, {
      assignee: undefined,
      assigneeGid: undefined
    });
  }
}
