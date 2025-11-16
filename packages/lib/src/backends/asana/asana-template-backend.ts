const Asana = require('asana');
import { ITemplateBackend, TaskTemplate } from '../core/template-backend';
import { Task } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the ITemplateBackend interface.
 *
 * This backend uses Asana's native Task Templates API for listing and
 * instantiating templates. Templates can be created manually in Asana.
 *
 * For backwards compatibility, createTemplate() creates a task tagged as
 * "template" which can be manually converted to a real template in Asana.
 */
export class AsanaTemplateBackend extends AsanaBackendBase implements ITemplateBackend {
  private tasksApi: any;
  private tagsApi: any;
  private taskTemplatesApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tasksApi = new Asana.TasksApi();
    this.tagsApi = new Asana.TagsApi();
    this.taskTemplatesApi = new Asana.TaskTemplatesApi();
  }

  async listTemplates(): Promise<TaskTemplate[]> {
    try {
      // Get all task templates available in the project
      const result = await this.taskTemplatesApi.getTaskTemplates({
        project: this.projectId,
        opt_fields: 'gid,name,template',
      });

      // Map Asana task templates to our TaskTemplate interface
      const templates = result.data || [];
      return templates.map((template: any) => this.mapTaskTemplateToTaskTemplate(template));
    } catch (error) {
      throw new Error(`Failed to list templates: ${error}`);
    }
  }

  async getTemplate(templateId: string): Promise<TaskTemplate> {
    try {
      const result = await this.taskTemplatesApi.getTaskTemplate(templateId, {
        opt_fields: 'gid,name,template',
      });

      return this.mapTaskTemplateToTaskTemplate(result.data);
    } catch (error) {
      throw new Error(`Failed to get template: ${error}`);
    }
  }

  async createTaskFromTemplate(
    templateId: string,
    taskName?: string,
    sectionId?: string
  ): Promise<Task> {
    try {
      // Instantiate a task from the template
      const requestBody: any = {
        name: taskName || 'Task from Template',
      };

      const jobResult = await this.taskTemplatesApi.instantiateTask(
        templateId,
        {
          body: { data: requestBody },
          opt_fields: 'gid,new_task.gid,new_task.name,status',
        }
      );

      // The API returns a job that handles the instantiation asynchronously
      const job = jobResult.data;

      if (!job.new_task || !job.new_task.gid) {
        throw new Error('Template instantiation did not return a task. Job may still be processing.');
      }

      const newTaskId = job.new_task.gid;

      // Move to section if specified
      if (sectionId) {
        await this.tasksApi.addTaskForSection({ data: { task: newTaskId } }, sectionId);
      }

      // Fetch and return the created task
      return await this.getTask(newTaskId);
    } catch (error) {
      throw new Error(`Failed to create task from template: ${error}`);
    }
  }

  async createTemplate(
    name: string,
    notes?: string,
    tags?: string[],
    priority?: string,
    isMilestone?: boolean
  ): Promise<TaskTemplate> {
    try {
      // Create the template task
      const taskData: any = {
        name,
        projects: [this.projectId],
      };

      if (notes) taskData.notes = notes;
      if (isMilestone) taskData.is_milestone = isMilestone;

      const result = await this.tasksApi.createTask({ data: taskData }, {
        opt_fields: 'gid,name,notes,tags.name',
      });

      const templateId = result.data.gid;

      // Always add the 'template' tag
      await this.ensureAndAddTag(templateId, 'template');

      // Add additional tags
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          await this.ensureAndAddTag(templateId, tag);
        }
      }

      // Add priority tag if specified
      if (priority) {
        await this.ensureAndAddTag(templateId, `priority:${priority}`);
      }

      // Fetch the created task and map it to a template
      const taskResult = await this.tasksApi.getTask(templateId, {
        opt_fields: 'gid,name,notes,tags.name,memberships.section.name,num_subtasks,is_milestone',
      });

      return this.mapToTemplate(taskResult.data);
    } catch (error) {
      throw new Error(`Failed to create template: ${error}`);
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.tasksApi.deleteTask(templateId);
    } catch (error) {
      throw new Error(`Failed to delete template: ${error}`);
    }
  }

  // Helper methods

  /**
   * Maps an Asana Task Template to our TaskTemplate interface
   */
  private mapTaskTemplateToTaskTemplate(taskTemplate: any): TaskTemplate {
    return {
      gid: taskTemplate.gid,
      name: taskTemplate.name,
      notes: taskTemplate.template || undefined,
      tags: undefined, // Task templates don't have tags in the API
      section: undefined,
      priority: undefined,
      isMilestone: undefined,
      subtasks: undefined, // Would need to instantiate to see subtasks
    };
  }

  /**
   * Maps a task tagged as "template" to our TaskTemplate interface
   * Used for backwards compatibility with createTemplate()
   */
  private mapToTemplate(task: any): TaskTemplate {
    const tags = task.tags?.map((tag: any) => tag.name) || [];
    const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
    const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

    // Filter out the 'template' tag from the tags array
    const filteredTags = tags.filter((t: string) => t.toLowerCase() !== 'template' && !t.startsWith('priority:'));

    return {
      gid: task.gid,
      name: task.name,
      notes: task.notes || undefined,
      tags: filteredTags.length > 0 ? filteredTags : undefined,
      section: task.memberships?.[0]?.section?.name || undefined,
      priority,
      isMilestone: task.is_milestone || undefined,
      subtasks: task.num_subtasks > 0 ? [] : undefined, // Placeholder, actual subtasks loaded on demand
    };
  }

  private async getTask(taskId: string): Promise<Task> {
    const result = await this.tasksApi.getTask(taskId, {
      opt_fields: 'gid,name,notes,completed,due_on,start_on,assignee.name,assignee.gid,tags.name,parent.gid,num_subtasks,num_likes,dependencies.gid,dependents.gid,is_milestone',
    });

    const task = result.data;
    const tags = task.tags?.map((tag: any) => tag.name) || [];
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
  }

  private async ensureAndAddTag(taskId: string, tagName: string): Promise<void> {
    try {
      // Find or create the tag
      const tagsResult = await this.tagsApi.getTagsForWorkspace(this.workspaceId);
      let tag = tagsResult.data.find((t: any) => t.name.toLowerCase() === tagName.toLowerCase());

      if (!tag) {
        const createResult = await this.tagsApi.createTag({
          data: {
            name: tagName,
            workspace: this.workspaceId,
          },
        });
        tag = createResult.data;
      }

      // Add tag to task
      await this.tasksApi.addTagForTask({ data: { tag: tag.gid } }, taskId);
    } catch (error) {
      throw new Error(`Failed to ensure and add tag: ${error}`);
    }
  }
}
