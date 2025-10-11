import { IDependencyBackend } from '../core/dependency-backend';
import { Task } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the IDependencyBackend interface.
 *
 * Manages task dependencies. Dependencies are stored in the task objects
 * themselves using the dependencies and dependents arrays.
 */
export class LocalDependencyBackend extends LocalBackendBase implements IDependencyBackend {
  private taskBackend: LocalTaskBackend;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);
    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  async addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    try {
      // Verify both tasks exist
      await this.taskBackend.getTask(taskId);
      await this.taskBackend.getTask(dependsOnTaskId);

      // Update the dependent task (the one that depends on another)
      const task = await this.taskBackend.getTask(taskId);
      const dependencies = task.dependencies || [];

      if (!dependencies.includes(dependsOnTaskId)) {
        dependencies.push(dependsOnTaskId);
        await this.taskBackend.updateTask(taskId, { dependencies });
      }

      // Update the blocking task (the one being depended on)
      const blockingTask = await this.taskBackend.getTask(dependsOnTaskId);
      const dependents = blockingTask.dependents || [];

      if (!dependents.includes(taskId)) {
        dependents.push(taskId);
        await this.taskBackend.updateTask(dependsOnTaskId, { dependents });
      }
    } catch (error) {
      throw new Error(`Failed to add dependency: ${error}`);
    }
  }

  async removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    try {
      // Update the dependent task
      const task = await this.taskBackend.getTask(taskId);
      const dependencies = task.dependencies || [];
      const filteredDependencies = dependencies.filter(id => id !== dependsOnTaskId);

      await this.taskBackend.updateTask(taskId, { dependencies: filteredDependencies });

      // Update the blocking task
      const blockingTask = await this.taskBackend.getTask(dependsOnTaskId);
      const dependents = blockingTask.dependents || [];
      const filteredDependents = dependents.filter(id => id !== taskId);

      await this.taskBackend.updateTask(dependsOnTaskId, { dependents: filteredDependents });
    } catch (error) {
      throw new Error(`Failed to remove dependency: ${error}`);
    }
  }

  async getDependencies(taskId: string): Promise<Task[]> {
    try {
      const task = await this.taskBackend.getTask(taskId);
      const dependencies = task.dependencies || [];

      // Fetch all dependency tasks
      const dependencyTasks: Task[] = [];
      for (const depId of dependencies) {
        try {
          const depTask = await this.taskBackend.getTask(depId);
          dependencyTasks.push(depTask);
        } catch (error) {
          // Skip missing dependencies
          console.warn(`Dependency task ${depId} not found`);
        }
      }

      return dependencyTasks;
    } catch (error) {
      throw new Error(`Failed to get dependencies: ${error}`);
    }
  }

  async getDependents(taskId: string): Promise<Task[]> {
    try {
      const task = await this.taskBackend.getTask(taskId);
      const dependents = task.dependents || [];

      // Fetch all dependent tasks
      const dependentTasks: Task[] = [];
      for (const depId of dependents) {
        try {
          const depTask = await this.taskBackend.getTask(depId);
          dependentTasks.push(depTask);
        } catch (error) {
          // Skip missing dependents
          console.warn(`Dependent task ${depId} not found`);
        }
      }

      return dependentTasks;
    } catch (error) {
      throw new Error(`Failed to get dependents: ${error}`);
    }
  }
}
