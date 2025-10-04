import { Task } from './types';

/**
 * Interface for task backend implementations.
 *
 * Defines core task operations (CRUD, completion, assignment).
 * This is the primary backend for managing individual tasks.
 *
 * Other domain operations (tags, sections, subtasks, etc.) are
 * handled by their respective domain backends.
 */
export interface ITaskBackend {
  /**
   * Lists all tasks in the configured project.
   *
   * Returns:
   *   Array of Task objects.
   */
  listTasks(): Promise<Task[]>;

  /**
   * Retrieves a specific task by ID.
   *
   * Args:
   *   taskId: The task GID to fetch.
   *
   * Returns:
   *   The requested Task object.
   */
  getTask(taskId: string): Promise<Task>;

  /**
   * Creates a new task.
   *
   * Args:
   *   name: Task name/title.
   *   notes: Optional task description.
   *   dueOn: Optional due date (YYYY-MM-DD).
   *   priority: Optional priority level (low, medium, high).
   *
   * Returns:
   *   The created Task object.
   */
  createTask(name: string, notes?: string, dueOn?: string, priority?: string): Promise<Task>;

  /**
   * Updates an existing task with partial changes.
   *
   * Args:
   *   taskId: The task GID to update.
   *   updates: Partial Task object with fields to update.
   *
   * Returns:
   *   The updated Task object.
   */
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;

  /**
   * Permanently deletes a task.
   *
   * Args:
   *   taskId: The task GID to delete.
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * Marks a task as complete.
   *
   * Args:
   *   taskId: The task GID to complete.
   *
   * Returns:
   *   The updated Task object with completed=true.
   */
  completeTask(taskId: string): Promise<Task>;

  /**
   * Assigns a task to a human user.
   *
   * Args:
   *   taskId: The task GID to assign.
   *   userGid: The user GID to assign to.
   *
   * Returns:
   *   The updated Task object.
   */
  assignToUser(taskId: string, userGid: string): Promise<Task>;

  /**
   * Unassigns a task from its current assignee.
   *
   * Args:
   *   taskId: The task GID to unassign.
   *
   * Returns:
   *   The updated Task object.
   */
  unassignTask(taskId: string): Promise<Task>;
}
