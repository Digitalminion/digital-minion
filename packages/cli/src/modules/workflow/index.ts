import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson } from '../../types/command-metadata';
import { Backends } from '@digital-minion/lib';

/**
 * Module for managing task workflows via custom fields.
 */
export class WorkflowModule implements Module {
  name = 'workflow';
  description = 'Manage task workflows and custom field statuses';

  metadata: CommandMetadata = {
    name: 'workflow',
    alias: 'wf',
    summary: 'Manage task workflows and custom field statuses',
    description: `Custom fields enable workflow management on tasks. Use enum fields to create
status workflows like "To Do → In Progress → Done" or priority tracking.

Note: Custom fields are a premium Asana feature.`,
    subcommands: [
      {
        name: 'fields',
        alias: 'ls',
        summary: 'List all custom fields available in the project',
        description: 'Shows all custom fields including type, enum options, and configuration.',
        examples: [
          {
            description: 'List all custom fields',
            command: 'dm workflow fields'
          },
          {
            description: 'List fields and parse as JSON',
            command: 'dm -o json workflow fields | jq \'.fields[]\''
          }
        ],
        notes: [
          'Custom fields are a premium Asana feature',
          'Fields can be of type: enum, number, text, multi_enum',
          'Enum fields support workflow status tracking'
        ]
      },
      {
        name: 'get',
        summary: 'Get all custom field values for a task',
        description: 'Retrieves all custom field values currently set on a task.',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID'
          }
        ],
        examples: [
          {
            description: 'Get custom field values for a task',
            command: 'dm workflow get 1234567890'
          },
          {
            description: 'Get field values and parse as JSON',
            command: 'dm -o json workflow get 1234567890 | jq \'.values[]\''
          }
        ]
      },
      {
        name: 'set',
        summary: 'Set a custom field value on a task',
        description: `Set a custom field value on a task. The value format depends on the field type:
- For enum fields, provide the option GID as the value
- For number fields, provide the numeric value
- For text fields, provide the text value`,
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID'
          },
          {
            name: 'fieldGid',
            required: true,
            type: 'string',
            description: 'The custom field GID'
          },
          {
            name: 'value',
            required: true,
            type: 'string',
            description: 'The value to set'
          }
        ],
        examples: [
          {
            description: 'Set enum field to a specific option',
            command: 'dm workflow set 1234567890 9876543210 1111111111'
          },
          {
            description: 'Set number field to 100',
            command: 'dm workflow set 1234567890 9876543210 100'
          },
          {
            description: 'Set text field to "In Progress"',
            command: 'dm workflow set 1234567890 9876543210 "In Progress"'
          }
        ]
      }
    ],
    notes: [
      'Custom fields are a premium Asana feature',
      'Use "workflow fields" to discover available custom fields and their GIDs',
      'Use "workflow get" to see current values before updating',
      'Enum field options have unique GIDs - use these as values when setting enum fields',
      'Number and text fields accept their respective value types directly'
    ]
  };

  register(program: Command): void {
    const workflowCmd = program
      .command('workflow')
      .alias('wf')
      .description(`Manage task workflows and custom field statuses

Custom fields enable workflow management on tasks. Use enum fields to create
status workflows like "To Do → In Progress → Done" or priority tracking.

Note: Custom fields are a premium Asana feature.`);

    // Add metadata help support
    workflowCmd.option('--help-json', 'Output command help as JSON');

    // Override help to support JSON output
    const originalHelp = workflowCmd.helpInformation.bind(workflowCmd);
    workflowCmd.helpInformation = () => {
      const opts = workflowCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    workflowCmd
      .command('fields')
      .alias('ls')
      .description(`List all custom fields available in the project

Shows all custom fields including type, enum options, and configuration.

Example:
  dm workflow fields
  dm -o json workflow fields | jq '.fields[]'`)
      .action(async () => {
        await this.listFields();
      });

    workflowCmd
      .command('get <taskId>')
      .description(`Get all custom field values for a task

Arguments:
  taskId - The task GID

Examples:
  dm workflow get 1234567890
  dm -o json workflow get 1234567890 | jq '.values[]'`)
      .action(async (taskId) => {
        await this.getTaskFields(taskId);
      });

    workflowCmd
      .command('set <taskId> <fieldGid> <value>')
      .description(`Set a custom field value on a task

For enum fields, provide the option GID as the value.
For number fields, provide the numeric value.
For text fields, provide the text value.

Arguments:
  taskId   - The task GID
  fieldGid - The custom field GID
  value    - The value to set

Examples:
  dm workflow set 1234567890 9876543210 1111111111
  # Sets enum field 9876543210 to option 1111111111

  dm workflow set 1234567890 9876543210 100
  # Sets number field to 100

  dm workflow set 1234567890 9876543210 "In Progress"
  # Sets text field to "In Progress"`)
      .action(async (taskId, fieldGid, value) => {
        await this.setTaskField(taskId, fieldGid, value);
      });
  }

  private getBackend() {
    return BackendProvider.getInstance().getWorkflowBackend();
  }

  private async listFields(): Promise<void> {
    try {
      const backend = this.getBackend();
      const fields = await backend.listCustomFields();

      if (fields.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ fields: [], count: 0 });
        } else {
          console.log('\nNo custom fields found.');
          console.log('Note: Custom fields are a premium Asana feature.');
          console.log();
        }
        return;
      }

      OutputFormatter.print(
        { fields, count: fields.length },
        () => {
          console.log(`\nCustom Fields (${fields.length}):\n`);
          fields.forEach(field => {
            console.log(`[${field.gid}] ${field.name}`);
            console.log(`  Type: ${field.type}`);
            if (field.description) console.log(`  Description: ${field.description}`);

            if (field.enumOptions && field.enumOptions.length > 0) {
              console.log('  Options:');
              field.enumOptions.forEach(opt => {
                const status = opt.enabled ? '✓' : '✗';
                console.log(`    ${status} [${opt.gid}] ${opt.name}${opt.color ? ` (${opt.color})` : ''}`);
              });
            }

            if (field.format) console.log(`  Format: ${field.format}`);
            if (field.precision !== undefined) console.log(`  Precision: ${field.precision}`);
            console.log();
          });
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing custom fields: ${error}`);
    }
  }

  private async getTaskFields(taskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const values = await backend.getCustomFieldValues(taskId);

      if (values.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ values: [], count: 0 });
        } else {
          console.log('\nNo custom field values found.');
          console.log();
        }
        return;
      }

      OutputFormatter.print(
        { values, count: values.length },
        () => {
          console.log(`\nCustom Field Values (${values.length}):\n`);
          values.forEach(value => {
            console.log(`[${value.gid}]${value.name ? ` ${value.name}` : ''}`);

            if (value.enumValue) {
              console.log(`  Value: ${value.enumValue.name}${value.enumValue.color ? ` (${value.enumValue.color})` : ''}`);
            } else if (value.multiEnumValues && value.multiEnumValues.length > 0) {
              console.log(`  Values: ${value.multiEnumValues.map(v => v.name).join(', ')}`);
            } else if (value.numberValue !== undefined) {
              console.log(`  Value: ${value.numberValue}`);
            } else if (value.textValue) {
              console.log(`  Value: ${value.textValue}`);
            } else if (value.displayValue) {
              console.log(`  Value: ${value.displayValue}`);
            } else {
              console.log(`  Value: (not set)`);
            }
            console.log();
          });
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error getting custom field values: ${error}`);
    }
  }

  private async setTaskField(taskId: string, fieldGid: string, value: string): Promise<void> {
    try {
      const backend = this.getBackend();

      // Try to parse as number first
      let fieldValue: any = value;
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        fieldValue = numValue;
      }

      await backend.setCustomFieldValue(taskId, fieldGid, fieldValue);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ success: true });
      } else {
        console.log(`\n✓ Custom field value updated`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error setting custom field value: ${error}`);
    }
  }
}
