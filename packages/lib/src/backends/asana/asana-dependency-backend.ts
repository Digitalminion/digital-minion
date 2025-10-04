const Asana = require('asana');
import { IDependencyBackend } from '../core/dependency-backend';
import { Task } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the IDependencyBackend interface.
 *
 * Provides task dependency management functionality using the Asana API,
 * handling dependency relationships between tasks to enforce execution order.
 */
export class AsanaDependencyBackend extends AsanaBackendBase implements IDependencyBackend {
  private tasksApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tasksApi = new Asana.TasksApi();
  }

  async addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    try {
      await this.tasksApi.addDependenciesForTask(
        { data: { dependencies: [dependsOnTaskId] } },
        taskId
      );
    } catch (error) {
      throw new Error(`Failed to add dependency: ${error}`);
    }
  }

  async removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    try {
      await this.tasksApi.removeDependenciesForTask(
        { data: { dependencies: [dependsOnTaskId] } },
        taskId
      );
    } catch (error) {
      throw new Error(`Failed to remove dependency: ${error}`);
    }
  }

  async getDependencies(taskId: string): Promise<Task[]> {
    try {
      const result = await this.tasksApi.getTask(taskId, {
        opt_fields: 'dependencies.gid,dependencies.name,dependencies.notes,dependencies.completed,dependencies.due_on,dependencies.start_on,dependencies.assignee.name,dependencies.assignee.gid,dependencies.tags.name,dependencies.parent.gid,dependencies.num_subtasks',
      });

      const dependencies = result.data.dependencies || [];
      return dependencies.map((task: any) => {
        const tags = task.tags?.map((tag: any) => tag.name) || [];
        const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
        const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

        return {
          gid: task.gid,
          name: task.name,
          notes: task.notes || undefined,
          completed: task.completed,
          dueOn: task.due_on || undefined,
          startOn: task.start_on || undefined,
          assignee: task.assignee?.name || undefined,
          assigneeGid: task.assignee?.gid || undefined,
          tags,
          parent: task.parent?.gid || undefined,
          numSubtasks: task.num_subtasks || undefined,
          priority,
        };
      });
    } catch (error) {
      throw new Error(`Failed to get dependencies: ${error}`);
    }
  }

  async getDependents(taskId: string): Promise<Task[]> {
    try {
      const result = await this.tasksApi.getTask(taskId, {
        opt_fields: 'dependents.gid,dependents.name,dependents.notes,dependents.completed,dependents.due_on,dependents.start_on,dependents.assignee.name,dependents.assignee.gid,dependents.tags.name,dependents.parent.gid,dependents.num_subtasks',
      });

      const dependents = result.data.dependents || [];
      return dependents.map((task: any) => {
        const tags = task.tags?.map((tag: any) => tag.name) || [];
        const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
        const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

        return {
          gid: task.gid,
          name: task.name,
          notes: task.notes || undefined,
          completed: task.completed,
          dueOn: task.due_on || undefined,
          startOn: task.start_on || undefined,
          assignee: task.assignee?.name || undefined,
          assigneeGid: task.assignee?.gid || undefined,
          tags,
          parent: task.parent?.gid || undefined,
          numSubtasks: task.num_subtasks || undefined,
          priority,
        };
      });
    } catch (error) {
      throw new Error(`Failed to get dependents: ${error}`);
    }
  }
}
