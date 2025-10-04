import { Attachment } from './types';

/**
 * Interface for attachment backend implementations.
 *
 * Handles file and URL attachments on tasks, including uploading files,
 * attaching external URLs, and managing attachment lifecycle.
 */
export interface IAttachmentBackend {
  /**
   * Lists all attachments on a task.
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of Attachment objects.
   */
  listAttachments(taskId: string): Promise<Attachment[]>;

  /**
   * Attaches a URL/link to a task.
   *
   * Args:
   *   taskId: The task GID.
   *   url: The URL to attach.
   *   name: Optional name for the attachment.
   *
   * Returns:
   *   The created Attachment object.
   */
  attachUrl(taskId: string, url: string, name?: string): Promise<Attachment>;

  /**
   * Uploads a file attachment to a task.
   *
   * Args:
   *   taskId: The task GID.
   *   filePath: Local path to the file to upload.
   *   name: Optional name for the attachment.
   *
   * Returns:
   *   The created Attachment object.
   */
  attachFile(taskId: string, filePath: string, name?: string): Promise<Attachment>;

  /**
   * Deletes an attachment from a task.
   *
   * Args:
   *   attachmentId: The attachment GID to delete.
   */
  deleteAttachment(attachmentId: string): Promise<void>;
}
