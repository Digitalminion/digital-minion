import { ISubtaskBackend } from '../core/subtask-backend';
import { Task } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the ISubtaskBackend interface.
 *
 * Manages subtasks (child tasks). Subtasks are stored as regular tasks
 * with a parent field pointing to their parent task.
 */
export class LocalSubtaskBackend extends LocalBackendBase implements ISubtaskBackend {
  private taskBackend: LocalTaskBackend;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);
    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  async listSubtasks(parentTaskId: string): Promise<Task[]> {
    try {
      // Verify parent task exists
      await this.taskBackend.getTask(parentTaskId);

      // Get all tasks and filter for subtasks
      const allTasks = await this.taskBackend.listTasks();
      return allTasks.filter(task => task.parent === parentTaskId);
    } catch (error) {
      throw new Error(`Failed to list subtasks: ${error}`);
    }
  }

  async createSubtask(
    parentTaskId: string,
    name: string,
    notes?: string,
    dueOn?: string
  ): Promise<Task> {
    try {
      // Verify parent task exists
      const parentTask = await this.taskBackend.getTask(parentTaskId);

      // Create the subtask with parent field
      const subtask = await this.taskBackend.createTask(name, notes, dueOn);

      // Update to set parent relationship
      const updatedSubtask = await this.taskBackend.updateTask(subtask.gid, {
        parent: parentTaskId,
      });

      // Update parent task's numSubtasks count
      const currentSubtasks = await this.listSubtasks(parentTaskId);
      await this.taskBackend.updateTask(parentTaskId, {
        numSubtasks: currentSubtasks.length,
      });

      return updatedSubtask;
    } catch (error) {
      throw new Error(`Failed to create subtask: ${error}`);
    }
  }
}
