import { CustomField, CustomFieldValue, Task } from './types';

/**
 * Interface for workflow backend implementations.
 *
 * Handles custom field operations for workflow management, allowing
 * tasks to have custom metadata fields for tracking additional information
 * beyond standard task properties.
 */
export interface IWorkflowBackend {
  /**
   * Lists all custom fields available in the project.
   *
   * Returns:
   *   Array of CustomField objects.
   */
  listCustomFields(): Promise<CustomField[]>;

  /**
   * Gets custom field values for a specific task.
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of CustomFieldValue objects.
   */
  getCustomFieldValues(taskId: string): Promise<CustomFieldValue[]>;

  /**
   * Sets a custom field value on a task.
   *
   * Args:
   *   taskId: The task GID.
   *   customFieldGid: The custom field GID.
   *   value: The value to set (enum gid, number, text, etc.).
   *
   * Returns:
   *   Updated task.
   */
  setCustomFieldValue(taskId: string, customFieldGid: string, value: any): Promise<Task>;
}
