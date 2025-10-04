import { Task } from './types';

/**
 * Interface for subtask backend implementations.
 *
 * Handles creating and listing subtasks, which are tasks that belong
 * to a parent task for hierarchical task decomposition.
 */
export interface ISubtaskBackend {
  /**
   * Lists all subtasks belonging to a parent task.
   *
   * Args:
   *   parentTaskId: The parent task GID.
   *
   * Returns:
   *   Array of Task objects representing subtasks.
   */
  listSubtasks(parentTaskId: string): Promise<Task[]>;

  /**
   * Creates a new subtask under a parent task.
   *
   * Args:
   *   parentTaskId: The parent task GID.
   *   name: Subtask name/title.
   *   notes: Optional subtask description.
   *   dueOn: Optional due date (YYYY-MM-DD).
   *
   * Returns:
   *   The created Task object representing the subtask.
   */
  createSubtask(parentTaskId: string, name: string, notes?: string, dueOn?: string): Promise<Task>;
}
