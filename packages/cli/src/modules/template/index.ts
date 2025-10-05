import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata } from '../../types/command-metadata';

/**
 * Module for task template management.
 *
 * Provides commands for creating reusable task templates, listing templates,
 * and instantiating tasks from templates with all associated metadata.
 */
export class TemplateModule implements Module {
  name = 'template';
  description = 'Manage reusable task templates';

  metadata: CommandMetadata = {
    name: 'template',
    alias: 'tpl',
    summary: 'Manage reusable task templates',
    description: `Task templates are reusable task structures that can be instantiated to quickly create new tasks with predefined properties like tags, notes, subtasks, and more.`,
    subcommands: [
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all task templates',
        description: 'Shows all available task templates in the project.',
        examples: [
          {
            description: 'List all templates',
            command: 'dm template list'
          },
          {
            description: 'List templates as JSON',
            command: 'dm -o json template list | jq \'.templates[]\''
          }
        ]
      },
      {
        name: 'get',
        summary: 'Get details of a specific template',
        description: 'Shows full details of a template including subtasks.',
        arguments: [
          {
            name: 'templateId',
            required: true,
            type: 'string',
            description: 'The template GID'
          }
        ],
        examples: [
          {
            description: 'View template details',
            command: 'dm template get 1234567890'
          }
        ]
      },
      {
        name: 'create',
        summary: 'Create a new task template',
        description: 'Creates a new task template with specified properties.',
        arguments: [
          {
            name: 'name',
            required: true,
            type: 'string',
            description: 'Template name'
          }
        ],
        options: [
          {
            name: '-n, --notes <notes>',
            description: 'Template description/notes'
          },
          {
            name: '-t, --tags <tags>',
            description: 'Comma-separated tags'
          },
          {
            name: '-p, --priority <priority>',
            description: 'Priority: low, medium, or high'
          },
          {
            name: '-m, --milestone',
            description: 'Mark as milestone template'
          }
        ],
        examples: [
          {
            description: 'Create simple template',
            command: 'dm template create "Bug Triage"'
          },
          {
            description: 'Create template with all options',
            command: 'dm template create "Feature Release" -n "Steps for releasing a new feature" -t "feature,release" -p high -m'
          }
        ]
      },
      {
        name: 'use',
        summary: 'Create a task from a template',
        description: 'Instantiates a new task from a template, copying all properties.',
        arguments: [
          {
            name: 'templateId',
            required: true,
            type: 'string',
            description: 'The template GID to use'
          }
        ],
        options: [
          {
            name: '-n, --name <name>',
            description: 'Name for the new task (defaults to template name)'
          },
          {
            name: '-s, --section <sectionId>',
            description: 'Section ID to place the task in'
          }
        ],
        examples: [
          {
            description: 'Create task from template',
            command: 'dm template use 1234567890'
          },
          {
            description: 'Create task with custom name',
            command: 'dm template use 1234567890 -n "Fix login bug"'
          },
          {
            description: 'Create task in specific section',
            command: 'dm template use 1234567890 -s 9876543210'
          }
        ]
      },
      {
        name: 'delete',
        alias: 'rm',
        summary: 'Delete a task template',
        description: 'Permanently removes a template.',
        arguments: [
          {
            name: 'templateId',
            required: true,
            type: 'string',
            description: 'The template GID to delete'
          }
        ],
        examples: [
          {
            description: 'Delete a template',
            command: 'dm template delete 1234567890'
          }
        ]
      }
    ],
    notes: [
      'Templates are tasks tagged with "template" in Asana',
      'Instantiating a template copies all properties except the "template" tag',
      'Subtasks defined in the template will be copied to new tasks'
    ]
  };

  register(program: Command): void {
    const templateCmd = program
      .command('template')
      .alias('tpl')
      .description(`Manage reusable task templates

Task templates are reusable task structures that can be instantiated to quickly
create new tasks with predefined properties like:
  - Tags and priority
  - Notes and descriptions
  - Subtasks
  - Milestone status

Templates streamline repetitive task creation with consistent structure.`);

    templateCmd
      .command('list')
      .alias('ls')
      .description('List all task templates')
      .action(async () => {
        await this.listTemplatesCmd();
      });

    templateCmd
      .command('get <templateId>')
      .description('Get details of a specific template')
      .action(async (templateId: string) => {
        await this.getTemplateCmd(templateId);
      });

    templateCmd
      .command('create <name>')
      .description('Create a new task template')
      .option('-n, --notes <notes>', 'Template description/notes')
      .option('-t, --tags <tags>', 'Comma-separated tags')
      .option('-p, --priority <priority>', 'Priority: low, medium, or high')
      .option('-m, --milestone', 'Mark as milestone template')
      .action(async (name: string, options: any) => {
        await this.createTemplateCmd(name, options);
      });

    templateCmd
      .command('use <templateId>')
      .description('Create a task from a template')
      .option('-n, --name <name>', 'Name for the new task (defaults to template name)')
      .option('-s, --section <sectionId>', 'Section ID to place the task in')
      .action(async (templateId: string, options: any) => {
        await this.useTemplateCmd(templateId, options);
      });

    templateCmd
      .command('delete <templateId>')
      .alias('rm')
      .description('Delete a task template')
      .action(async (templateId: string) => {
        await this.deleteTemplateCmd(templateId);
      });
  }

  private async listTemplatesCmd(): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTemplateBackend();
      const templates = await backend.listTemplates();

      if (templates.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ templates: [], count: 0 });
        } else {
          console.log('No templates found.');
        }
        return;
      }

      OutputFormatter.print(
        { templates, count: templates.length },
        () => {
          console.log(`\nFound ${templates.length} template(s):\n`);
          for (const tpl of templates) {
            console.log(`📋 ${tpl.name} (${tpl.gid})`);
            if (tpl.notes) {
              console.log(`   ${tpl.notes.substring(0, 60)}${tpl.notes.length > 60 ? '...' : ''}`);
            }
            if (tpl.tags && tpl.tags.length > 0) {
              console.log(`   Tags: ${tpl.tags.join(', ')}`);
            }
            if (tpl.priority) {
              console.log(`   Priority: ${tpl.priority}`);
            }
            if (tpl.isMilestone) {
              console.log(`   🏁 Milestone`);
            }
            if (tpl.subtasks && tpl.subtasks.length > 0) {
              console.log(`   Subtasks: ${tpl.subtasks.length}`);
            }
            console.log();
          }
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing templates: ${error}`);
    }
  }

  private async getTemplateCmd(templateId: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTemplateBackend();
      const tpl = await backend.getTemplate(templateId);

      OutputFormatter.print(
        { template: tpl },
        () => {
          console.log(`\n📋 ${tpl.name} (${tpl.gid})`);
          if (tpl.notes) {
            console.log(`\nNotes:\n${tpl.notes}`);
          }
          if (tpl.tags && tpl.tags.length > 0) {
            console.log(`\nTags: ${tpl.tags.join(', ')}`);
          }
          if (tpl.section) {
            console.log(`\nSection: ${tpl.section}`);
          }
          if (tpl.priority) {
            console.log(`\nPriority: ${tpl.priority}`);
          }
          if (tpl.isMilestone) {
            console.log(`\n🏁 Milestone Template`);
          }
          if (tpl.subtasks && tpl.subtasks.length > 0) {
            console.log(`\nSubtasks (${tpl.subtasks.length}):`);
            for (const subtask of tpl.subtasks) {
              console.log(`  - ${subtask.name}`);
              if (subtask.notes) {
                console.log(`    ${subtask.notes}`);
              }
            }
          }
          console.log();
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error getting template: ${error}`);
    }
  }

  private async createTemplateCmd(name: string, options: any): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTemplateBackend();

      const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined;

      const template = await backend.createTemplate(
        name,
        options.notes,
        tags,
        options.priority,
        options.milestone
      );

      console.log(`\n✓ Template created: ${template.name} (${template.gid})`);
      if (template.notes) {
        console.log(`   ${template.notes}`);
      }
      if (template.tags && template.tags.length > 0) {
        console.log(`   Tags: ${template.tags.join(', ')}`);
      }
      if (template.priority) {
        console.log(`   Priority: ${template.priority}`);
      }
      console.log();
    } catch (error) {
      console.error(`✗ Error creating template: ${error}`);
      process.exit(1);
    }
  }

  private async useTemplateCmd(templateId: string, options: any): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTemplateBackend();

      const task = await backend.createTaskFromTemplate(
        templateId,
        options.name,
        options.section
      );

      console.log(`\n✓ Task created from template: ${task.name} (${task.gid})`);
      if (task.notes) {
        console.log(`   ${task.notes}`);
      }
      if (task.tags && task.tags.length > 0) {
        console.log(`   Tags: ${task.tags.join(', ')}`);
      }
      if (task.numSubtasks) {
        console.log(`   Subtasks: ${task.numSubtasks}`);
      }
      console.log();
    } catch (error) {
      console.error(`✗ Error creating task from template: ${error}`);
      process.exit(1);
    }
  }

  private async deleteTemplateCmd(templateId: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTemplateBackend();
      await backend.deleteTemplate(templateId);
      console.log(`\n✓ Template deleted: ${templateId}\n`);
    } catch (error) {
      console.error(`✗ Error deleting template: ${error}`);
      process.exit(1);
    }
  }
}
