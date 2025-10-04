const Asana = require('asana');
import { ISubtaskBackend } from '../core/subtask-backend';
import { Task } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the ISubtaskBackend interface.
 *
 * Provides subtask management functionality using the Asana API,
 * including creating subtasks and listing subtasks for a parent task.
 */
export class AsanaSubtaskBackend extends AsanaBackendBase implements ISubtaskBackend {
  private tasksApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tasksApi = new Asana.TasksApi();
  }

  async listSubtasks(parentTaskId: string): Promise<Task[]> {
    try {
      const result = await this.tasksApi.getSubtasksForTask(parentTaskId, {
        opt_fields: 'gid,name,notes,completed,due_on,assignee.name,tags.name,parent.gid,num_subtasks',
      });

      return result.data.map((task: any) => {
        const tags = task.tags?.map((tag: any) => tag.name) || [];
        // Derive priority from priority:* tags
        const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
        const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

        return {
          gid: task.gid,
          name: task.name,
          notes: task.notes || undefined,
          completed: task.completed,
          dueOn: task.due_on || undefined,
          assignee: task.assignee?.name || undefined,
          tags,
          parent: task.parent?.gid || undefined,
          numSubtasks: task.num_subtasks || undefined,
          priority,
        };
      });
    } catch (error) {
      throw new Error(`Failed to list subtasks: ${error}`);
    }
  }

  async createSubtask(parentTaskId: string, name: string, notes?: string, dueOn?: string): Promise<Task> {
    try {
      const taskData: any = {
        name,
        parent: parentTaskId,
      };

      if (notes) taskData.notes = notes;
      if (dueOn) taskData.due_on = dueOn;

      const result = await this.tasksApi.createTask(
        { data: taskData },
        {
          opt_fields: 'gid,name,notes,completed,due_on,assignee.name,tags.name,parent.gid,num_subtasks',
        }
      );

      const task = result.data;
      return {
        gid: task.gid,
        name: task.name,
        notes: task.notes || undefined,
        completed: task.completed,
        dueOn: task.due_on || undefined,
        assignee: task.assignee?.name || undefined,
        tags: task.tags?.map((tag: any) => tag.name) || [],
        parent: task.parent?.gid || undefined,
        numSubtasks: task.num_subtasks || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create subtask: ${error}`);
    }
  }
}
