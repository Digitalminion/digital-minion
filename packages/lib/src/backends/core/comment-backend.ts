import { Comment } from './types';

/**
 * Interface for comment backend implementations.
 *
 * Handles comment/story operations on tasks, allowing users to add
 * textual updates, discussions, and notes to tasks.
 */
export interface ICommentBackend {
  /**
   * Lists all comments on a task.
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of Comment objects.
   */
  listComments(taskId: string): Promise<Comment[]>;

  /**
   * Creates a new comment on a task.
   *
   * Args:
   *   taskId: The task GID.
   *   text: Comment text content.
   *
   * Returns:
   *   The created Comment object.
   */
  createComment(taskId: string, text: string): Promise<Comment>;
}
