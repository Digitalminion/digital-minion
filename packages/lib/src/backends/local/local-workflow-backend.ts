import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { IWorkflowBackend } from '../core/workflow-backend';
import { CustomField, CustomFieldValue, Task } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Custom field value storage record.
 * Maps task GID + custom field GID to values.
 */
interface CustomFieldValueRecord {
  gid: string;
  taskGid: string;
  customFieldGid: string;
  value: any;
}

/**
 * Local file-based implementation of the IWorkflowBackend interface.
 *
 * Manages custom fields for workflow management. This is a simplified
 * implementation for local storage that supports basic custom field
 * operations without full Asana-style custom field complexity.
 */
export class LocalWorkflowBackend extends LocalBackendBase implements IWorkflowBackend {
  private customFieldStorage: JsonlRowStorage<CustomField>;
  private customFieldValueStorage: JsonlRowStorage<CustomFieldValueRecord>;
  private customFieldsFile: string;
  private customFieldValuesFile: string;
  private taskBackend: LocalTaskBackend;
  private initialized: boolean = false;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);

    this.customFieldStorage = new JsonlRowStorage<CustomField>();
    this.customFieldValueStorage = new JsonlRowStorage<CustomFieldValueRecord>();

    this.customFieldsFile = path.join(
      this.basePath,
      this.projectId,
      'custom-fields.jsonl'
    );
    this.customFieldValuesFile = path.join(
      this.basePath,
      this.projectId,
      'custom-field-values.jsonl'
    );

    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.customFieldsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async listCustomFields(): Promise<CustomField[]> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.customFieldsFile)) {
        return [];
      }
      return await this.customFieldStorage.readAll(this.customFieldsFile);
    } catch (error) {
      throw new Error(`Failed to list custom fields: ${error}`);
    }
  }

  async getCustomFieldValues(taskId: string): Promise<CustomFieldValue[]> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      await this.taskBackend.getTask(taskId);

      if (!fs.existsSync(this.customFieldValuesFile)) {
        return [];
      }

      const allValues = await this.customFieldValueStorage.readAll(this.customFieldValuesFile);
      const taskValues = allValues.filter(v => v.taskGid === taskId);

      // Get custom field definitions
      const customFields = await this.listCustomFields();

      // Convert to CustomFieldValue format
      return taskValues.map(record => {
        const field = customFields.find(f => f.gid === record.customFieldGid);

        const customFieldValue: CustomFieldValue = {
          gid: record.customFieldGid,
          name: field?.name,
          displayValue: this.formatValue(record.value, field?.type),
        };

        // Set appropriate value based on field type
        if (field?.type === 'enum' || field?.type === 'multi_enum') {
          customFieldValue.enumValue = record.value;
        } else if (field?.type === 'number') {
          customFieldValue.numberValue = record.value;
        } else if (field?.type === 'text') {
          customFieldValue.textValue = record.value;
        }

        return customFieldValue;
      });
    } catch (error) {
      throw new Error(`Failed to get custom field values: ${error}`);
    }
  }

  async setCustomFieldValue(taskId: string, customFieldGid: string, value: any): Promise<Task> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      const task = await this.taskBackend.getTask(taskId);

      // Verify custom field exists
      const customFields = await this.listCustomFields();
      const customField = customFields.find(f => f.gid === customFieldGid);

      if (!customField) {
        throw new Error(`Custom field with ID ${customFieldGid} not found`);
      }

      // Load existing values
      let values: CustomFieldValueRecord[] = [];
      if (fs.existsSync(this.customFieldValuesFile)) {
        values = await this.customFieldValueStorage.readAll(this.customFieldValuesFile);
      }

      // Find or create value record
      const existingIndex = values.findIndex(
        v => v.taskGid === taskId && v.customFieldGid === customFieldGid
      );

      if (existingIndex >= 0) {
        // Update existing value
        values[existingIndex].value = value;
      } else {
        // Create new value record
        values.push({
          gid: uuidv4(),
          taskGid: taskId,
          customFieldGid,
          value,
        });
      }

      // Write back
      await this.customFieldValueStorage.writeAll(this.customFieldValuesFile, values);

      // Return updated task
      return await this.taskBackend.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to set custom field value: ${error}`);
    }
  }

  /**
   * Formats a custom field value for display.
   */
  private formatValue(value: any, fieldType?: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (fieldType === 'number') {
      return String(value);
    }

    if (fieldType === 'enum' || fieldType === 'multi_enum') {
      if (typeof value === 'object' && value.name) {
        return value.name;
      }
      return String(value);
    }

    return String(value);
  }
}
