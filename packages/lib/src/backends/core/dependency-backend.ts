import { Task } from './types';

/**
 * Interface for dependency backend implementations.
 *
 * Handles task dependency relationships, allowing tasks to be blocked by
 * or block other tasks to enforce execution order and dependencies.
 */
export interface IDependencyBackend {
  /**
   * Adds a dependency relationship between tasks.
   *
   * Args:
   *   taskId: The task GID that depends on another.
   *   dependsOnTaskId: The task GID that this task depends on.
   */
  addDependency(taskId: string, dependsOnTaskId: string): Promise<void>;

  /**
   * Removes a dependency relationship between tasks.
   *
   * Args:
   *   taskId: The task GID.
   *   dependsOnTaskId: The task GID to remove the dependency from.
   */
  removeDependency(taskId: string, dependsOnTaskId: string): Promise<void>;

  /**
   * Gets all tasks that this task depends on (blocking tasks).
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of Task objects that this task depends on.
   */
  getDependencies(taskId: string): Promise<Task[]>;

  /**
   * Gets all tasks that depend on this task (blocked tasks).
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of Task objects that depend on this task.
   */
  getDependents(taskId: string): Promise<Task[]>;
}
