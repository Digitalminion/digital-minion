import { ISubtaskBackend } from '../core/subtask-backend';
import { Task } from '../core/types';
import { PlannerConfig, PlannerBackendBase } from './planner-config';

/**
 * Represents task details with checklist
 */
interface PlannerTaskDetails {
  id: string;
  checklist?: Record<string, {
    title: string;
    isChecked: boolean;
    orderHint: string;
    lastModifiedDateTime: string;
    lastModifiedBy: { user: { id: string; displayName: string } };
  }>;
  '@odata.etag': string;
}

/**
 * Microsoft Planner-based implementation of the ISubtaskBackend interface.
 *
 * NOTE: This implementation has significant limitations due to Planner's architecture.
 * Planner does not have true subtasks - it has "checklist items" which are much simpler.
 * Checklist items only have: title, isChecked, orderHint. They do NOT have:
 * - Due dates
 * - Assignees
 * - Notes/descriptions
 * - Their own subtasks
 * - Independent GIDs (they're part of task details)
 *
 * This backend maps checklist items to Task objects, but many Task fields will be undefined.
 */
export class PlannerSubtaskBackend extends PlannerBackendBase implements ISubtaskBackend {
  constructor(config: PlannerConfig) {
    super(config);
  }

  async listSubtasks(taskId: string): Promise<Task[]> {
    try {
      const details = await this.getTaskDetails(taskId);

      if (!details || !details.checklist) {
        return [];
      }

      // Convert checklist items to Task objects
      return Object.entries(details.checklist).map(([checklistItemId, item]) => ({
        gid: checklistItemId,
        name: item.title,
        completed: item.isChecked,
        parent: taskId,
        // These fields don't exist for checklist items
        notes: undefined,
        dueOn: undefined,
        startOn: undefined,
        assignee: undefined,
        assigneeGid: undefined,
        tags: undefined,
        priority: undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to list subtasks: ${error}`);
    }
  }

  async createSubtask(parentTaskId: string, name: string, notes?: string): Promise<Task> {
    try {
      // Generate a unique ID for the checklist item (UUID-like)
      const checklistItemId = this.generateChecklistItemId();

      // Add checklist item to task details
      await this.withEtag(
        () => this.getTaskDetails(parentTaskId),
        (etag) =>
          this.graphClient.patch<PlannerTaskDetails>(
            `/planner/tasks/${parentTaskId}/details`,
            {
              checklist: {
                [checklistItemId]: {
                  '@odata.type': '#microsoft.graph.plannerChecklistItem',
                  title: name,
                  isChecked: false,
                  orderHint: ' !', // Places at end
                },
              },
            },
            { headers: { 'If-Match': etag } }
          )
      );

      // Note: We lose the notes parameter - checklist items don't support notes
      if (notes) {
        console.warn('Planner checklist items do not support notes. Notes will be ignored.');
      }

      return {
        gid: checklistItemId,
        name,
        completed: false,
        parent: parentTaskId,
        notes: undefined,
        dueOn: undefined,
        startOn: undefined,
        assignee: undefined,
        assigneeGid: undefined,
        tags: undefined,
        priority: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create subtask: ${error}`);
    }
  }

  async deleteSubtask(subtaskId: string): Promise<void> {
    try {
      // We need to find which task this checklist item belongs to
      // This is a limitation - we don't have a direct way to do this
      // For now, we'll throw an error asking for the parent task ID
      throw new Error(
        'Planner checklist items cannot be deleted by ID alone. ' +
        'Use deleteSubtaskFromTask(parentTaskId, subtaskId) instead.'
      );
    } catch (error) {
      throw new Error(`Failed to delete subtask: ${error}`);
    }
  }

  /**
   * Delete a subtask from a specific parent task
   *
   * Extension method - required because Planner checklist items
   * don't have independent existence
   *
   * @param parentTaskId - The parent task ID
   * @param subtaskId - The checklist item ID
   */
  async deleteSubtaskFromTask(parentTaskId: string, subtaskId: string): Promise<void> {
    try {
      await this.withEtag(
        () => this.getTaskDetails(parentTaskId),
        (etag) =>
          this.graphClient.patch<PlannerTaskDetails>(
            `/planner/tasks/${parentTaskId}/details`,
            {
              checklist: {
                [subtaskId]: null, // Setting to null removes it
              },
            },
            { headers: { 'If-Match': etag } }
          )
      );
    } catch (error) {
      throw new Error(`Failed to delete subtask from task: ${error}`);
    }
  }

  /**
   * Update a checklist item (mark as checked/unchecked)
   *
   * Extension method - useful for toggling subtask completion
   *
   * @param parentTaskId - The parent task ID
   * @param subtaskId - The checklist item ID
   * @param completed - Whether the item is checked
   */
  async updateSubtask(
    parentTaskId: string,
    subtaskId: string,
    completed: boolean
  ): Promise<Task> {
    try {
      const details = await this.getTaskDetails(parentTaskId);

      if (!details.checklist || !details.checklist[subtaskId]) {
        throw new Error('Subtask not found');
      }

      const existingItem = details.checklist[subtaskId];

      await this.graphClient.patch<PlannerTaskDetails>(
        `/planner/tasks/${parentTaskId}/details`,
        {
          checklist: {
            [subtaskId]: {
              '@odata.type': '#microsoft.graph.plannerChecklistItem',
              title: existingItem.title,
              isChecked: completed,
              orderHint: existingItem.orderHint,
            },
          },
        },
        { headers: { 'If-Match': details['@odata.etag'] } }
      );

      return {
        gid: subtaskId,
        name: existingItem.title,
        completed,
        parent: parentTaskId,
        notes: undefined,
        dueOn: undefined,
        startOn: undefined,
        assignee: undefined,
        assigneeGid: undefined,
        tags: undefined,
        priority: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to update subtask: ${error}`);
    }
  }

  /**
   * Get task details
   */
  private async getTaskDetails(taskId: string): Promise<PlannerTaskDetails> {
    try {
      const details = await this.graphClient.get<PlannerTaskDetails>(
        `/planner/tasks/${taskId}/details`
      );
      return details;
    } catch (error) {
      throw new Error(`Failed to get task details: ${error}`);
    }
  }

  /**
   * Generate a unique ID for a checklist item
   */
  private generateChecklistItemId(): string {
    // Generate a GUID-like string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
