const Asana = require('asana');
import { Task, TaskBackend, Tag, Section, Comment } from './types';
import { AsanaConfig } from '../../config/types';

/**
 * Asana-based implementation of the TaskBackend interface.
 *
 * Provides task management functionality using the Asana API as the backend
 * storage system. Handles all CRUD operations for tasks, tags, sections,
 * and subtasks within a configured Asana project.
 */
export class AsanaTaskBackend implements TaskBackend {
  private tasksApi: any;
  private tagsApi: any;
  private sectionsApi: any;
  private projectsApi: any;
  private storiesApi: any;
  private client: any;
  private accessToken: string;
  private projectId: string;
  private workspaceId: string;

  constructor(config: AsanaConfig) {
    const client = Asana.ApiClient.instance;
    const token = client.authentications['token'];
    token.accessToken = config.accessToken;

    this.client = client;
    this.accessToken = config.accessToken;
    this.tasksApi = new Asana.TasksApi();
    this.tagsApi = new Asana.TagsApi();
    this.sectionsApi = new Asana.SectionsApi();
    this.projectsApi = new Asana.ProjectsApi();
    this.storiesApi = new Asana.StoriesApi();
    this.projectId = config.projectId;
    this.workspaceId = config.workspaceId;
  }

  async listTasks(): Promise<Task[]> {
    try {
      const result = await this.tasksApi.getTasksForProject(this.projectId, {
        opt_fields: 'gid,name,notes,completed,due_on,assignee.name,tags.name,parent.gid,num_subtasks,memberships.section.name,memberships.section.gid',
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
          assignee: task.assignee?.name || undefined,
          tags,
          parent: task.parent?.gid || undefined,
          numSubtasks: task.num_subtasks || undefined,
          memberships: task.memberships || undefined,
          priority,
        };
      });
    } catch (error) {
      throw new Error(`Failed to list tasks: ${error}`);
    }
  }

  async getTask(taskId: string): Promise<Task> {
    try {
      const result = await this.tasksApi.getTask(taskId, {
        opt_fields: 'gid,name,notes,completed,due_on,assignee.name,tags.name,parent.gid,num_subtasks',
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
        assignee: task.assignee?.name || undefined,
        tags,
        parent: task.parent?.gid || undefined,
        numSubtasks: task.num_subtasks || undefined,
        priority,
      };
    } catch (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  async createTask(name: string, notes?: string, dueOn?: string, priority?: string): Promise<Task> {
    try {
      const taskData: any = {
        name,
        projects: [this.projectId],
      };

      if (notes) taskData.notes = notes;
      if (dueOn) taskData.due_on = dueOn;

      const result = await this.tasksApi.createTask({ data: taskData }, {
        opt_fields: 'gid,name,notes,completed,due_on,assignee.name,tags.name',
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

  async listTags(): Promise<Tag[]> {
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

  async createTag(name: string): Promise<Tag> {
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

  async addTagToTask(taskId: string, tagId: string): Promise<void> {
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

  async removeTagFromTask(taskId: string, tagId: string): Promise<void> {
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

  async listSections(): Promise<Section[]> {
    try {
      const result = await this.sectionsApi.getSectionsForProject(this.projectId);
      return result.data.map((section: any) => ({
        gid: section.gid,
        name: section.name,
      }));
    } catch (error) {
      throw new Error(`Failed to list sections: ${error}`);
    }
  }

  async createSection(name: string): Promise<Section> {
    try {
      // Use direct REST API call since the Node.js library doesn't have this method
      const response = await fetch(`https://app.asana.com/api/1.0/projects/${this.projectId}/sections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { name } }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: any = await response.json();
      return {
        gid: result.data.gid,
        name: result.data.name,
      };
    } catch (error) {
      throw new Error(`Failed to create section: ${error}`);
    }
  }

  async moveTaskToSection(taskId: string, sectionId: string): Promise<void> {
    try {
      // Use the tasks API to add the task to the section
      await this.tasksApi.addProjectForTask(
        { data: { project: this.projectId, section: sectionId } },
        taskId
      );
    } catch (error) {
      throw new Error(`Failed to move task to section: ${error}`);
    }
  }

  async listSubtasks(parentTaskId: string): Promise<Task[]> {
    try {
      const result = await this.tasksApi.getSubtasksForTask(parentTaskId, {
        opt_fields: 'gid,name,notes,completed,due_on,assignee.name,tags.name,parent.gid,num_subtasks',
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
          assignee: task.assignee?.name || undefined,
          tags,
          parent: task.parent?.gid || undefined,
          numSubtasks: task.num_subtasks || undefined,
          priority,
        };
      });
    } catch (error) {
      throw new Error(`Failed to list subtasks: ${error}`);
    }
  }

  async createSubtask(parentTaskId: string, name: string, notes?: string, dueOn?: string): Promise<Task> {
    try {
      const taskData: any = {
        name,
        parent: parentTaskId,
      };

      if (notes) taskData.notes = notes;
      if (dueOn) taskData.due_on = dueOn;

      const result = await this.tasksApi.createTask(
        { data: taskData },
        {
          opt_fields: 'gid,name,notes,completed,due_on,assignee.name,tags.name,parent.gid,num_subtasks',
        }
      );

      const task = result.data;
      return {
        gid: task.gid,
        name: task.name,
        notes: task.notes || undefined,
        completed: task.completed,
        dueOn: task.due_on || undefined,
        assignee: task.assignee?.name || undefined,
        tags: task.tags?.map((tag: any) => tag.name) || [],
        parent: task.parent?.gid || undefined,
        numSubtasks: task.num_subtasks || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create subtask: ${error}`);
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

  async listComments(taskId: string): Promise<Comment[]> {
    try {
      const result = await this.storiesApi.getStoriesForTask(taskId, {
        opt_fields: 'gid,text,created_by.name,created_at,resource_subtype',
      });

      // Filter to only comment stories (not system-generated stories)
      return result.data
        .filter((story: any) => story.resource_subtype === 'comment_added')
        .map((story: any) => ({
          gid: story.gid,
          text: story.text || '',
          createdBy: story.created_by?.name || undefined,
          createdAt: story.created_at || undefined,
        }));
    } catch (error) {
      throw new Error(`Failed to list comments: ${error}`);
    }
  }

  async createComment(taskId: string, text: string): Promise<Comment> {
    try {
      const result = await this.storiesApi.createStoryForTask(
        { data: { text } },
        taskId,
        {
          opt_fields: 'gid,text,created_by.name,created_at',
        }
      );

      const story = result.data;
      return {
        gid: story.gid,
        text: story.text || '',
        createdBy: story.created_by?.name || undefined,
        createdAt: story.created_at || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create comment: ${error}`);
    }
  }
}
