const Asana = require('asana');
import { ITaskBackend } from '../core/task-backend';
import { Task, Tag } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the ITaskBackend interface.
 *
 * Provides task management functionality using the Asana API as the backend
 * storage system. Handles all CRUD operations for tasks, including creation,
 * retrieval, updates, deletion, completion, and assignment.
 *
 * This class focuses exclusively on task-related operations as defined by
 * the ITaskBackend interface.
 */
export class AsanaTaskBackend extends AsanaBackendBase implements ITaskBackend {
  private tasksApi: any;
  private tagsApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tasksApi = new Asana.TasksApi();
    this.tagsApi = new Asana.TagsApi();
  }

  async listTasks(): Promise<Task[]> {
    try {
      const result = await this.tasksApi.getTasksForProject(this.projectId, {
        opt_fields: 'gid,name,notes,completed,due_on,start_on,assignee.name,assignee.gid,tags.name,parent.gid,num_subtasks,memberships.section.name,memberships.section.gid,num_likes,dependencies.gid,dependents.gid,is_milestone',
      });

      return result.data.map((task: any) => {
        const tags = task.tags?.map((tag: any) => tag.name) || [];
        // Derive priority from priority:* tags
        const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
        const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

        return {
          gid: task.gid,
          name: task.name,
          notes: task.notes || undefined,
          completed: task.completed,
          dueOn: task.due_on || undefined,
          startOn: task.start_on || undefined,
          assignee: task.assignee?.name || undefined,
          assigneeGid: task.assignee?.gid || undefined,
          tags,
          parent: task.parent?.gid || undefined,
          numSubtasks: task.num_subtasks || undefined,
          memberships: task.memberships || undefined,
          priority,
          isMilestone: task.is_milestone || undefined,
          numAttachments: task.num_likes || undefined,
          dependencies: task.dependencies?.map((d: any) => d.gid) || undefined,
          dependents: task.dependents?.map((d: any) => d.gid) || undefined,
        };
      });
    } catch (error) {
      throw new Error(`Failed to list tasks: ${error}`);
    }
  }

  async getTask(taskId: string): Promise<Task> {
    try {
      const result = await this.tasksApi.getTask(taskId, {
        opt_fields: 'gid,name,notes,completed,due_on,start_on,assignee.name,assignee.gid,tags.name,parent.gid,num_subtasks,num_likes,dependencies.gid,dependents.gid,is_milestone',
      });

      const task = result.data;
      const tags = task.tags?.map((tag: any) => tag.name) || [];
      // Derive priority from priority:* tags
      const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
      const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

      return {
        gid: task.gid,
        name: task.name,
        notes: task.notes || undefined,
        completed: task.completed,
        dueOn: task.due_on || undefined,
        startOn: task.start_on || undefined,
        assignee: task.assignee?.name || undefined,
        assigneeGid: task.assignee?.gid || undefined,
        tags,
        parent: task.parent?.gid || undefined,
        numSubtasks: task.num_subtasks || undefined,
        priority,
        isMilestone: task.is_milestone || undefined,
        numAttachments: task.num_likes || undefined,
        dependencies: task.dependencies?.map((d: any) => d.gid) || undefined,
        dependents: task.dependents?.map((d: any) => d.gid) || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  async createTask(name: string, notes?: string, dueOn?: string, priority?: string, isMilestone?: boolean): Promise<Task> {
    try {
      const taskData: any = {
        name,
        projects: [this.projectId],
      };

      if (notes) taskData.notes = notes;
      if (dueOn) taskData.due_on = dueOn;
      if (isMilestone !== undefined) taskData.is_milestone = isMilestone;

      const result = await this.tasksApi.createTask({ data: taskData }, {
        opt_fields: 'gid,name,notes,completed,due_on,assignee.name,tags.name,is_milestone',
      });

      const task = result.data;
      const taskGid = task.gid;

      // Add priority tag if specified
      if (priority) {
        const priorityTagName = `priority:${priority}`;
        await this.ensureAndAddTag(taskGid, priorityTagName);
      }

      // Fetch the updated task to get the tag
      const updatedTask = await this.getTask(taskGid);
      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    try {
      const taskData: any = {};

      if (updates.name !== undefined) taskData.name = updates.name;
      if (updates.notes !== undefined) taskData.notes = updates.notes;
      if (updates.completed !== undefined) taskData.completed = updates.completed;
      if (updates.dueOn !== undefined) taskData.due_on = updates.dueOn;
      if (updates.startOn !== undefined) taskData.start_on = updates.startOn;
      if (updates.isMilestone !== undefined) taskData.is_milestone = updates.isMilestone;

      // Update standard fields if any
      if (Object.keys(taskData).length > 0) {
        await this.tasksApi.updateTask({ data: taskData }, taskId, {
          opt_fields: 'gid',
        });
      }

      // Handle priority via tags
      if (updates.priority !== undefined) {
        await this.updatePriorityTag(taskId, updates.priority);
      }

      // Fetch and return updated task
      return await this.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.tasksApi.deleteTask(taskId);
    } catch (error) {
      throw new Error(`Failed to delete task: ${error}`);
    }
  }

  async completeTask(taskId: string): Promise<Task> {
    return this.updateTask(taskId, { completed: true });
  }

  async assignToUser(taskId: string, userGid: string): Promise<Task> {
    try {
      await this.tasksApi.updateTask(
        { data: { assignee: userGid } },
        taskId,
        {
          opt_fields: 'gid',
        }
      );
      return await this.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to assign task to user: ${error}`);
    }
  }

  async unassignTask(taskId: string): Promise<Task> {
    try {
      await this.tasksApi.updateTask(
        { data: { assignee: null } },
        taskId,
        {
          opt_fields: 'gid',
        }
      );
      return await this.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to unassign task: ${error}`);
    }
  }

  /**
   * Helper method to list tags in the workspace.
   * Used internally by ensureAndAddTag and updatePriorityTag.
   */
  private async listTags(): Promise<Tag[]> {
    try {
      const result = await this.tagsApi.getTagsForWorkspace(this.workspaceId);
      return result.data.map((tag: any) => ({
        gid: tag.gid,
        name: tag.name,
      }));
    } catch (error) {
      throw new Error(`Failed to list tags: ${error}`);
    }
  }

  /**
   * Helper method to create a tag in the workspace.
   * Used internally by ensureAndAddTag.
   */
  private async createTag(name: string): Promise<Tag> {
    try {
      const result = await this.tagsApi.createTag({
        data: {
          name,
          workspace: this.workspaceId,
        },
      });

      return {
        gid: result.data.gid,
        name: result.data.name,
      };
    } catch (error) {
      throw new Error(`Failed to create tag: ${error}`);
    }
  }

  /**
   * Helper method to add a tag to a task.
   * Used internally by ensureAndAddTag.
   */
  private async addTagToTask(taskId: string, tagId: string): Promise<void> {
    try {
      await this.tasksApi.addTagForTask({
        data: {
          tag: tagId,
        },
      }, taskId);
    } catch (error) {
      throw new Error(`Failed to add tag to task: ${error}`);
    }
  }

  /**
   * Helper method to remove a tag from a task.
   * Used internally by updatePriorityTag.
   */
  private async removeTagFromTask(taskId: string, tagId: string): Promise<void> {
    try {
      await this.tasksApi.removeTagForTask({
        data: {
          tag: tagId,
        },
      }, taskId);
    } catch (error) {
      throw new Error(`Failed to remove tag from task: ${error}`);
    }
  }

  /**
   * Helper method to ensure a tag exists and add it to a task.
   * Creates the tag if it doesn't exist, then adds it to the task.
   */
  private async ensureAndAddTag(taskId: string, tagName: string): Promise<void> {
    try {
      // Find or create the tag
      const tags = await this.listTags();
      let tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

      if (!tag) {
        tag = await this.createTag(tagName);
      }

      // Add tag to task
      await this.addTagToTask(taskId, tag.gid);
    } catch (error) {
      throw new Error(`Failed to ensure and add tag: ${error}`);
    }
  }

  /**
   * Helper method to update priority via tags.
   * Removes existing priority:* tags and adds the new one.
   */
  private async updatePriorityTag(taskId: string, priority: string): Promise<void> {
    try {
      // Get current task to see existing priority tags
      const task = await this.getTask(taskId);
      const allTags = await this.listTags();

      // Remove any existing priority:* tags
      if (task.tags) {
        const priorityTags = task.tags.filter(t => t.startsWith('priority:'));
        for (const priorityTagName of priorityTags) {
          const tag = allTags.find(t => t.name.toLowerCase() === priorityTagName.toLowerCase());
          if (tag) {
            await this.removeTagFromTask(taskId, tag.gid);
          }
        }
      }

      // Add new priority tag
      const newPriorityTag = `priority:${priority}`;
      await this.ensureAndAddTag(taskId, newPriorityTag);
    } catch (error) {
      throw new Error(`Failed to update priority tag: ${error}`);
    }
  }
}
