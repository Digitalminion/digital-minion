import { ITaskBackend } from '../core/task-backend';
import { Task } from '../core/types';
import { PlannerConfig, PlannerBackendBase } from './planner-config';

/**
 * Represents a Planner task from the Graph API
 */
interface PlannerTask {
  id: string;
  title: string;
  planId: string;
  bucketId?: string;
  percentComplete: number;
  startDateTime?: string;
  dueDateTime?: string;
  hasDescription: boolean;
  priority: number;
  assignments?: Record<string, { '@odata.type': string; orderHint: string }>;
  appliedCategories?: Record<string, boolean>;
  conversationThreadId?: string;
  referenceCount?: number;
  checklistItemCount?: number;
  activeChecklistItemCount?: number;
  createdDateTime?: string;
  completedDateTime?: string;
  completedBy?: { user: { id: string; displayName: string } };
  '@odata.etag': string;
}

/**
 * Represents Planner task details from the Graph API
 */
interface PlannerTaskDetails {
  id: string;
  description?: string;
  references?: Record<string, {
    alias: string;
    type: string;
    previewPriority: string;
    lastModifiedDateTime: string;
    lastModifiedBy: { user: { id: string; displayName: string } };
  }>;
  checklist?: Record<string, {
    title: string;
    isChecked: boolean;
    orderHint: string;
    lastModifiedDateTime: string;
    lastModifiedBy: { user: { id: string; displayName: string } };
  }>;
  previewType?: string;
  '@odata.etag': string;
}

/**
 * Microsoft Planner-based implementation of the ITaskBackend interface.
 *
 * Provides task management functionality using the Microsoft Graph API as the backend
 * storage system. Handles all CRUD operations for tasks, including creation,
 * retrieval, updates, deletion, completion, and assignment.
 *
 * This class focuses exclusively on task-related operations as defined by
 * the ITaskBackend interface.
 */
export class PlannerTaskBackend extends PlannerBackendBase implements ITaskBackend {
  constructor(config: PlannerConfig) {
    super(config);
  }

  async listTasks(): Promise<Task[]> {
    try {
      const result = await this.graphClient.get<{ value: PlannerTask[] }>(
        `/planner/plans/${this.planId}/tasks`,
        {
          select: [
            'id',
            'title',
            'percentComplete',
            'startDateTime',
            'dueDateTime',
            'hasDescription',
            'priority',
            'assignments',
            'appliedCategories',
            'bucketId',
            'checklistItemCount',
            'activeChecklistItemCount',
            'referenceCount',
            'createdDateTime',
            'completedDateTime',
          ],
        }
      );

      return result.value.map(task => this.mapPlannerTaskToTask(task));
    } catch (error) {
      throw new Error(`Failed to list tasks: ${error}`);
    }
  }

  async getTask(taskId: string): Promise<Task> {
    try {
      // Fetch both task and task details
      const [task, details] = await Promise.all([
        this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`),
        this.getTaskDetails(taskId),
      ]);

      return this.mapPlannerTaskToTask(task, details);
    } catch (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  async createTask(
    name: string,
    notes?: string,
    dueOn?: string,
    priority?: string,
    isMilestone?: boolean
  ): Promise<Task> {
    try {
      // Create the basic task
      const taskData: any = {
        planId: this.planId,
        title: name,
      };

      if (dueOn) {
        taskData.dueDateTime = `${dueOn}T00:00:00Z`;
      }

      if (priority) {
        taskData.priority = this.mapPriorityToNumber(priority);
      }

      const createdTask = await this.graphClient.post<PlannerTask>(
        '/planner/tasks',
        taskData
      );

      // If we have notes or milestone flag, update task details
      if (notes || isMilestone) {
        await this.updateTaskDetails(createdTask.id, notes, isMilestone);
      }

      // Return the complete task
      return await this.getTask(createdTask.id);
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    try {
      // Prepare basic task updates
      const taskUpdates: any = {};
      let hasTaskUpdates = false;

      if (updates.name !== undefined) {
        taskUpdates.title = updates.name;
        hasTaskUpdates = true;
      }

      if (updates.completed !== undefined) {
        taskUpdates.percentComplete = updates.completed ? 100 : 0;
        hasTaskUpdates = true;
      }

      if (updates.dueOn !== undefined) {
        taskUpdates.dueDateTime = updates.dueOn ? `${updates.dueOn}T00:00:00Z` : null;
        hasTaskUpdates = true;
      }

      if (updates.startOn !== undefined) {
        taskUpdates.startDateTime = updates.startOn ? `${updates.startOn}T00:00:00Z` : null;
        hasTaskUpdates = true;
      }

      if (updates.priority !== undefined) {
        taskUpdates.priority = this.mapPriorityToNumber(updates.priority);
        hasTaskUpdates = true;
      }

      // Update basic task properties if any
      if (hasTaskUpdates) {
        await this.withEtag(
          () => this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`),
          (etag) =>
            this.graphClient.patch<PlannerTask>(
              `/planner/tasks/${taskId}`,
              taskUpdates,
              { headers: { 'If-Match': etag } }
            )
        );
      }

      // Update task details if notes changed
      if (updates.notes !== undefined) {
        await this.updateTaskDetails(taskId, updates.notes);
      }

      // Return updated task
      return await this.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.withEtag(
        () => this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`),
        (etag) =>
          this.graphClient.delete(`/planner/tasks/${taskId}`, {
            headers: { 'If-Match': etag },
          })
      );
    } catch (error) {
      throw new Error(`Failed to delete task: ${error}`);
    }
  }

  async completeTask(taskId: string): Promise<Task> {
    return this.updateTask(taskId, { completed: true });
  }

  async assignToUser(taskId: string, userGid: string): Promise<Task> {
    try {
      await this.withEtag(
        () => this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`),
        (etag) =>
          this.graphClient.patch<PlannerTask>(
            `/planner/tasks/${taskId}`,
            {
              assignments: {
                [userGid]: {
                  '@odata.type': '#microsoft.graph.plannerAssignment',
                  orderHint: ' !',
                },
              },
            },
            { headers: { 'If-Match': etag } }
          )
      );

      return await this.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to assign task to user: ${error}`);
    }
  }

  async unassignTask(taskId: string): Promise<Task> {
    try {
      // Get current task to see who is assigned
      const task = await this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`);

      if (!task.assignments || Object.keys(task.assignments).length === 0) {
        return this.mapPlannerTaskToTask(task);
      }

      // Build assignments object with null values to remove all assignments
      const assignmentsToRemove: any = {};
      Object.keys(task.assignments).forEach((userId) => {
        assignmentsToRemove[userId] = null;
      });

      await this.graphClient.patch<PlannerTask>(
        `/planner/tasks/${taskId}`,
        { assignments: assignmentsToRemove },
        { headers: { 'If-Match': task['@odata.etag'] } }
      );

      return await this.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to unassign task: ${error}`);
    }
  }

  /**
   * Get task details (description, checklist, references)
   */
  private async getTaskDetails(taskId: string): Promise<PlannerTaskDetails | null> {
    try {
      const details = await this.graphClient.get<PlannerTaskDetails>(
        `/planner/tasks/${taskId}/details`
      );
      return details;
    } catch (error) {
      // Task details might not exist yet
      return null;
    }
  }

  /**
   * Update task details (description, checklist, references)
   */
  private async updateTaskDetails(
    taskId: string,
    description?: string,
    isMilestone?: boolean
  ): Promise<void> {
    try {
      const detailsUpdates: any = {};

      if (description !== undefined) {
        detailsUpdates.description = description;
      }

      // Use preview type to indicate milestone (hack, but works)
      if (isMilestone !== undefined) {
        detailsUpdates.previewType = isMilestone ? 'description' : 'automatic';
      }

      await this.withEtag(
        () => this.graphClient.get<PlannerTaskDetails>(`/planner/tasks/${taskId}/details`),
        (etag) =>
          this.graphClient.patch<PlannerTaskDetails>(
            `/planner/tasks/${taskId}/details`,
            detailsUpdates,
            { headers: { 'If-Match': etag } }
          )
      );
    } catch (error) {
      throw new Error(`Failed to update task details: ${error}`);
    }
  }

  /**
   * Map Planner task to our Task interface
   */
  private mapPlannerTaskToTask(plannerTask: PlannerTask, details?: PlannerTaskDetails | null): Task {
    // Get first assignee (Planner supports multiple, we only use one)
    const assigneeId = plannerTask.assignments
      ? Object.keys(plannerTask.assignments)[0]
      : undefined;

    // Extract categories/tags
    const tags = plannerTask.appliedCategories
      ? Object.keys(plannerTask.appliedCategories).filter(
          (key) => plannerTask.appliedCategories![key]
        )
      : undefined;

    // Map priority (0-10) to low/medium/high
    const priority = this.mapNumberToPriority(plannerTask.priority);

    return {
      gid: plannerTask.id,
      name: plannerTask.title,
      notes: details?.description,
      completed: plannerTask.percentComplete === 100,
      dueOn: plannerTask.dueDateTime
        ? plannerTask.dueDateTime.split('T')[0]
        : undefined,
      startOn: plannerTask.startDateTime
        ? plannerTask.startDateTime.split('T')[0]
        : undefined,
      assigneeGid: assigneeId,
      tags,
      priority,
      numSubtasks: plannerTask.checklistItemCount,
      numAttachments: plannerTask.referenceCount,
      // Note: bucketId is stored but not exposed in our interface
      // Note: isMilestone is hard to represent - we'd need a custom approach
    };
  }

  /**
   * Map priority string to Planner priority number (0-10)
   */
  private mapPriorityToNumber(priority: string): number {
    switch (priority.toLowerCase()) {
      case 'low':
        return 1;
      case 'medium':
        return 5;
      case 'high':
        return 9;
      default:
        return 5;
    }
  }

  /**
   * Map Planner priority number (0-10) to priority string
   */
  private mapNumberToPriority(priorityNum: number): 'low' | 'medium' | 'high' | undefined {
    if (priorityNum === undefined || priorityNum === null) return undefined;
    if (priorityNum <= 3) return 'low';
    if (priorityNum <= 6) return 'medium';
    return 'high';
  }
}
