import { Tag } from './types';

/**
 * Interface for tag backend implementations.
 *
 * Handles tag management operations including creating tags,
 * listing available tags, and managing tag relationships with tasks.
 */
export interface ITagBackend {
  /**
   * Lists all tags in the workspace.
   *
   * Returns:
   *   Array of Tag objects.
   */
  listTags(): Promise<Tag[]>;

  /**
   * Creates a new tag.
   *
   * Args:
   *   name: Tag name/label.
   *
   * Returns:
   *   The created Tag object.
   */
  createTag(name: string): Promise<Tag>;

  /**
   * Adds a tag to a task.
   *
   * Args:
   *   taskId: The task GID to tag.
   *   tagId: The tag GID to add.
   */
  addTagToTask(taskId: string, tagId: string): Promise<void>;

  /**
   * Removes a tag from a task.
   *
   * Args:
   *   taskId: The task GID.
   *   tagId: The tag GID to remove.
   */
  removeTagFromTask(taskId: string, tagId: string): Promise<void>;
}
