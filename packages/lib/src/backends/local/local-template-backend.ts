import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { ITemplateBackend, TaskTemplate } from '../core/template-backend';
import { Task } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';
import { LocalSubtaskBackend } from './local-subtask-backend';

/**
 * Local file-based implementation of the ITemplateBackend interface.
 *
 * Manages task templates - reusable structures that can quickly create
 * tasks with predefined configurations including subtasks.
 */
export class LocalTemplateBackend extends LocalBackendBase implements ITemplateBackend {
  private storage: JsonlRowStorage<TaskTemplate>;
  private templatesFile: string;
  private taskBackend: LocalTaskBackend;
  private subtaskBackend: LocalSubtaskBackend;
  private initialized: boolean = false;

  constructor(
    config: LocalConfig,
    taskBackend?: LocalTaskBackend,
    subtaskBackend?: LocalSubtaskBackend
  ) {
    super(config);

    this.storage = new JsonlRowStorage<TaskTemplate>();
    this.templatesFile = path.join(
      this.basePath,
      this.projectId,
      'templates.jsonl'
    );

    this.taskBackend = taskBackend || new LocalTaskBackend(config);
    this.subtaskBackend = subtaskBackend || new LocalSubtaskBackend(config, this.taskBackend);
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.templatesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async listTemplates(): Promise<TaskTemplate[]> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.templatesFile)) {
        return [];
      }
      return await this.storage.readAll(this.templatesFile);
    } catch (error) {
      throw new Error(`Failed to list templates: ${error}`);
    }
  }

  async getTemplate(templateId: string): Promise<TaskTemplate> {
    await this.ensureInitialized();

    try {
      const templates = await this.listTemplates();
      const template = templates.find(t => t.gid === templateId);

      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`);
      }

      return template;
    } catch (error) {
      throw new Error(`Failed to get template: ${error}`);
    }
  }

  async createTaskFromTemplate(
    templateId: string,
    taskName?: string,
    sectionId?: string
  ): Promise<Task> {
    await this.ensureInitialized();

    try {
      const template = await this.getTemplate(templateId);

      // Create the main task from template
      const task = await this.taskBackend.createTask(
        taskName || template.name,
        template.notes,
        undefined,
        template.priority,
        template.isMilestone
      );

      // Apply tags from template
      if (template.tags && template.tags.length > 0) {
        await this.taskBackend.updateTask(task.gid, { tags: template.tags });
      }

      // Move to section if specified
      if (sectionId) {
        // Add section membership
        const memberships = [
          {
            section: {
              gid: sectionId,
              name: '', // Will be filled by section backend
            },
          },
        ];
        await this.taskBackend.updateTask(task.gid, { memberships });
      } else if (template.section) {
        // Use template's default section
        const memberships = [
          {
            section: {
              gid: '', // Will be resolved by section backend
              name: template.section,
            },
          },
        ];
        await this.taskBackend.updateTask(task.gid, { memberships });
      }

      // Create subtasks from template
      if (template.subtasks && template.subtasks.length > 0) {
        for (const subtaskTemplate of template.subtasks) {
          await this.subtaskBackend.createSubtask(
            task.gid,
            subtaskTemplate.name,
            subtaskTemplate.notes
          );
        }
      }

      // Refresh task to get updated data
      return await this.taskBackend.getTask(task.gid);
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
    await this.ensureInitialized();

    try {
      const template: TaskTemplate = {
        gid: uuidv4(),
        name,
        notes,
        tags,
        priority: priority as 'low' | 'medium' | 'high' | undefined,
        isMilestone,
        subtasks: [],
      };

      await this.storage.appendRows(this.templatesFile, [template]);

      return template;
    } catch (error) {
      throw new Error(`Failed to create template: ${error}`);
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const templates = await this.listTemplates();
      const filteredTemplates = templates.filter(t => t.gid !== templateId);

      if (filteredTemplates.length === templates.length) {
        throw new Error(`Template with ID ${templateId} not found`);
      }

      await this.storage.writeAll(this.templatesFile, filteredTemplates);
    } catch (error) {
      throw new Error(`Failed to delete template: ${error}`);
    }
  }
}
