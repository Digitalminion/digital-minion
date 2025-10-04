const Asana = require('asana');
import { IWorkflowBackend } from '../core/workflow-backend';
import { CustomField, CustomFieldValue, Task } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the IWorkflowBackend interface.
 *
 * Provides custom field management functionality using the Asana API,
 * handling workflow metadata fields for tasks beyond standard properties.
 */
export class AsanaWorkflowBackend extends AsanaBackendBase implements IWorkflowBackend {
  private customFieldsApi: any;
  private tasksApi: any;
  private projectsApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.customFieldsApi = new Asana.CustomFieldsApi();
    this.tasksApi = new Asana.TasksApi();
    this.projectsApi = new Asana.ProjectsApi();
  }

  async listCustomFields(): Promise<CustomField[]> {
    try {
      const result = await this.projectsApi.getProject(this.projectId, {
        opt_fields: 'custom_field_settings.custom_field',
      });

      const customFields = result.data.custom_field_settings?.map((setting: any) => {
        const field = setting.custom_field;
        return {
          gid: field.gid,
          name: field.name,
          type: field.resource_subtype || field.type,
          description: field.description || undefined,
          enumOptions: field.enum_options?.map((opt: any) => ({
            gid: opt.gid,
            name: opt.name,
            color: opt.color || undefined,
            enabled: opt.enabled !== false,
          })) || undefined,
          precision: field.precision || undefined,
          format: field.format || undefined,
          createdAt: field.created_at || undefined,
        };
      }) || [];

      return customFields;
    } catch (error) {
      throw new Error(`Failed to list custom fields: ${error}`);
    }
  }

  async getCustomFieldValues(taskId: string): Promise<CustomFieldValue[]> {
    try {
      const result = await this.tasksApi.getTask(taskId, {
        opt_fields: 'custom_fields',
      });

      const customFields = result.data.custom_fields?.map((field: any) => {
        const value: CustomFieldValue = {
          gid: field.gid,
          name: field.name || undefined,
          displayValue: field.display_value || undefined,
        };

        if (field.enum_value) {
          value.enumValue = {
            gid: field.enum_value.gid,
            name: field.enum_value.name,
            color: field.enum_value.color || undefined,
            enabled: field.enum_value.enabled !== false,
          };
        }

        if (field.multi_enum_values) {
          value.multiEnumValues = field.multi_enum_values.map((opt: any) => ({
            gid: opt.gid,
            name: opt.name,
            color: opt.color || undefined,
            enabled: opt.enabled !== false,
          }));
        }

        if (field.number_value !== undefined) {
          value.numberValue = field.number_value;
        }

        if (field.text_value !== undefined) {
          value.textValue = field.text_value;
        }

        return value;
      }) || [];

      return customFields;
    } catch (error) {
      throw new Error(`Failed to get custom field values: ${error}`);
    }
  }

  async setCustomFieldValue(taskId: string, customFieldGid: string, value: any): Promise<Task> {
    try {
      await this.tasksApi.updateTask(
        { data: { custom_fields: { [customFieldGid]: value } } },
        taskId,
        {
          opt_fields: 'gid',
        }
      );

      // Fetch and return the updated task
      const result = await this.tasksApi.getTask(taskId, {
        opt_fields: 'gid,name,notes,completed,due_on,start_on,assignee.name,assignee.gid,tags.name,parent.gid,num_subtasks,num_likes,dependencies.gid,dependents.gid',
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
        numAttachments: task.num_likes || undefined,
        dependencies: task.dependencies?.map((d: any) => d.gid) || undefined,
        dependents: task.dependents?.map((d: any) => d.gid) || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to set custom field value: ${error}`);
    }
  }
}
