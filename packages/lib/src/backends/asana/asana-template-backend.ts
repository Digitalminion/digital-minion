const Asana = require('asana');
import { ITemplateBackend } from '../core/template-backend';
import { TaskTemplate, Task } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the ITemplateBackend interface.
 *
 * In Asana, templates are implemented as specially tagged tasks in a
 * "Templates" section. When instantiating a template, we duplicate
 * the template task with its subtasks.
 */
export class AsanaTemplateBackend extends AsanaBackendBase implements ITemplateBackend {
  private tasksApi: any;
  private tagsApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tasksApi = new Asana.TasksApi();
    this.tagsApi = new Asana.TagsApi();
  }

  async listTemplates(): Promise<TaskTemplate[]> {
    try {
      // Get all tasks in the project
      const result = await this.tasksApi.getTasksForProject(this.projectId, {
        opt_fields: 'gid,name,notes,tags.name,memberships.section.name,num_subtasks',
      });

      // Filter for tasks tagged as templates
      const templates = result.data.filter((task: any) => {
        const tags = task.tags?.map((tag: any) => tag.name.toLowerCase()) || [];
        return tags.includes('template');
      });

      return templates.map((task: any) => this.mapToTemplate(task));
    } catch (error) {
      throw new Error(`Failed to list templates: ${error}`);
    }
  }

  async getTemplate(templateId: string): Promise<TaskTemplate> {
    try {
      const result = await this.tasksApi.getTask(templateId, {
        opt_fields: 'gid,name,notes,tags.name,memberships.section.name,num_subtasks',
      });

      return this.mapToTemplate(result.data);
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
      // Get the template task
      const template = await this.getTemplate(templateId);

      // Create the main task from template
      const taskData: any = {
        name: taskName || template.name,
        projects: [this.projectId],
      };

      if (template.notes) taskData.notes = template.notes;
      if (template.isMilestone) taskData.is_milestone = true;

      const result = await this.tasksApi.createTask({ data: taskData }, {
        opt_fields: 'gid,name,notes,completed,due_on,tags.name',
      });

      const newTaskId = result.data.gid;

      // Add tags from template
      if (template.tags && template.tags.length > 0) {
        for (const tagName of template.tags) {
          // Skip the 'template' tag
          if (tagName.toLowerCase() === 'template') continue;

          await this.ensureAndAddTag(newTaskId, tagName);
        }
      }

      // Add priority tag if specified
      if (template.priority) {
        await this.ensureAndAddTag(newTaskId, `priority:${template.priority}`);
      }

      // Move to section if specified
      if (sectionId) {
        await this.tasksApi.addTaskForSection({ data: { task: newTaskId } }, sectionId);
      }

      // Copy subtasks if template has them
      if (template.subtasks && template.subtasks.length > 0) {
        // Get actual subtasks from the template
        const subtasksResult = await this.tasksApi.getSubtasksForTask(templateId, {
          opt_fields: 'gid,name,notes',
        });

        for (const subtask of subtasksResult.data) {
          await this.tasksApi.createSubtaskForTask(
            {
              data: {
                name: subtask.name,
                notes: subtask.notes || undefined,
              },
            },
            newTaskId
          );
        }
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

      return await this.getTemplate(templateId);
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
