import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata } from '../../types/command-metadata';
import { addMetadataHelp } from '../../utils/command-help';

/**
 * Module for tag management and task categorization.
 *
 * Provides commands for creating tags, listing available tags, and adding/removing
 * tags from tasks. Tags enable powerful filtering and organization, including
 * agent assignments via "agent:name" tags.
 */
export class TagModule implements Module {
  name = 'tag';
  description = 'Manage tags for organizing and categorizing tasks';

  metadata: CommandMetadata = {
    name: 'tag',
    alias: 'tg',
    summary: 'Manage tags for organizing and categorizing tasks',
    description: `Tags are labels you apply to tasks for organization and filtering. Common tag patterns include priority levels, modules/areas, task types, and status markers. Tags enable powerful filtering and categorization of work.`,
    subcommands: [
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all tags in the workspace',
        description: 'Shows all available tags you can apply to tasks. Use this to see what organizational tags exist, find exact tag names for filtering, and discover existing categorization schemes.',
        examples: [
          {
            description: 'List all tags',
            command: 'dm tag list'
          },
          {
            description: 'List tags and parse as JSON',
            command: 'dm -o json tag list | jq \'.tags[] | .name\''
          }
        ],
        notes: [
          'Tags starting with "agent:" are agent assignments'
        ]
      },
      {
        name: 'create',
        summary: 'Create a new tag',
        description: 'Creates a new tag that can be applied to tasks. Choose descriptive names that follow your project\'s tagging conventions.',
        arguments: [
          {
            name: 'name',
            required: true,
            type: 'string',
            description: 'Tag name (e.g., "priority:high", "bug", "module:auth")'
          }
        ],
        examples: [
          {
            description: 'Create a priority tag',
            command: 'dm tag create "priority:high"'
          },
          {
            description: 'Create an urgency tag',
            command: 'dm tag create "urgent"'
          },
          {
            description: 'Create a module tag',
            command: 'dm tag create "module:backend"'
          }
        ],
        notes: [
          'Use consistent naming: "priority:high" not "High Priority"',
          'Group related tags with prefixes: "module:auth", "module:api"',
          'Keep names lowercase for easier filtering'
        ]
      },
      {
        name: 'add',
        summary: 'Add a tag to a task',
        description: 'Applies an existing tag to a task. The tag must already exist (use "dm tag create" first if needed).',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID to tag'
          },
          {
            name: 'tagName',
            required: true,
            type: 'string',
            description: 'Existing tag name (case-insensitive)'
          }
        ],
        examples: [
          {
            description: 'Add a priority tag to a task',
            command: 'dm tag add 1234567890 "priority:high"'
          },
          {
            description: 'Add a bug tag',
            command: 'dm tag add 1234567890 bug'
          },
          {
            description: 'Bulk tag tasks matching a search',
            command: 'for id in $(dm -o json list --search "login" -i | jq -r \'.tasks[].gid\'); do dm tag add "$id" "module:auth"; done'
          }
        ]
      },
      {
        name: 'remove',
        alias: 'rm',
        summary: 'Remove a tag from a task',
        description: 'Removes a tag from a task. Task remains unchanged otherwise.',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID'
          },
          {
            name: 'tagName',
            required: true,
            type: 'string',
            description: 'Tag name to remove (case-insensitive)'
          }
        ],
        examples: [
          {
            description: 'Remove a priority tag',
            command: 'dm tag remove 1234567890 "priority:high"'
          },
          {
            description: 'Remove a bug tag',
            command: 'dm tag rm 1234567890 bug'
          }
        ],
        notes: [
          'To remove agent assignments, use "dm unassign <taskId>" instead'
        ]
      }
    ],
    notes: [
      'Priority levels: priority:high, priority:medium, priority:low',
      'Modules/Areas: module:auth, module:api, module:frontend',
      'Task types: bug, feature, refactor, documentation',
      'Status markers: blocked, in-review, ready',
      'Agent assignments use tags (agent:name), managed via "dm assign" commands',
      'Filter tasks by tag: dm list --tag <name>'
    ]
  };

  register(program: Command): void {
    const tagCmd = program
      .command('tag')
      .alias('tg')
      .description(this.metadata.summary);

    // Add progressive help support
    addMetadataHelp(tagCmd, this.metadata);

    tagCmd
      .command('list')
      .alias('ls')
      .description(`List all tags in the workspace

Shows all available tags you can apply to tasks. Use this to:
  - See what organizational tags exist
  - Find the exact tag name for filtering
  - Discover existing categorization schemes

Example:
  dm tag list
  dm -o json tag list | jq '.tags[] | .name'

TIP: Tags starting with "agent:" are agent assignments`)
      .action(async () => {
        await this.listTagsCmd();
      });

    tagCmd
      .command('create <name>')
      .description(`Create a new tag

Creates a new tag that can be applied to tasks. Choose descriptive names
that follow your project's tagging conventions.

Arguments:
  name - Tag name (e.g., "priority:high", "bug", "module:auth")

Examples:
  dm tag create "priority:high"
  dm tag create "urgent"
  dm tag create "module:backend"

Best practices:
  - Use consistent naming: "priority:high" not "High Priority"
  - Group related tags with prefixes: "module:auth", "module:api"
  - Keep names lowercase for easier filtering`)
      .action(async (name) => {
        await this.createTagCmd(name);
      });

    tagCmd
      .command('add <taskId> <tagName>')
      .description(`Add a tag to a task

Applies an existing tag to a task. The tag must already exist (use
"dm tag create" first if needed).

Arguments:
  taskId  - The task GID to tag
  tagName - Existing tag name (case-insensitive)

Examples:
  dm tag add 1234567890 "priority:high"
  dm tag add 1234567890 bug

Bulk tagging workflow:
  # Tag all incomplete tasks matching a search
  for id in $(dm -o json list --search "login" -i | jq -r '.tasks[].gid'); do
    dm tag add "$id" "module:auth"
  done`)
      .action(async (taskId, tagName) => {
        await this.addTagToTaskCmd(taskId, tagName);
      });

    tagCmd
      .command('remove <taskId> <tagName>')
      .alias('rm')
      .description(`Remove a tag from a task

Removes a tag from a task. Task remains unchanged otherwise.

Arguments:
  taskId  - The task GID
  tagName - Tag name to remove (case-insensitive)

Examples:
  dm tag remove 1234567890 "priority:high"
  dm tag rm 1234567890 bug

NOTE: To remove agent assignments, use "dm unassign <taskId>" instead`)
      .action(async (taskId, tagName) => {
        await this.removeTagFromTaskCmd(taskId, tagName);
      });
  }


  private async listTagsCmd(): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTagBackend();
      const tags = await backend.listTags();

      if (tags.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ tags: [], count: 0 });
        } else {
          console.log('No tags found.');
        }
        return;
      }

      OutputFormatter.print(
        { tags, count: tags.length },
        () => {
          console.log(`\nTags (${tags.length}):\n`);
          tags.forEach((tag: Backends.Tag) => {
            console.log(`  [${tag.gid}] ${tag.name}`);
          });
          console.log();
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing tags: ${error}`);
    }
  }

  private async createTagCmd(name: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTagBackend();
      const tag = await backend.createTag(name);

      console.log(`\n✓ Tag created: ${tag.name} [${tag.gid}]`);
      console.log();
    } catch (error) {
      console.error(`✗ Error creating tag: ${error}`);
      process.exit(1);
    }
  }

  private async addTagToTaskCmd(taskId: string, tagName: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTagBackend();

      // First, find the tag by name
      const tags = await backend.listTags();
      const tag = tags.find((t: Backends.Tag) => t.name.toLowerCase() === tagName.toLowerCase());

      if (!tag) {
        console.error(`✗ Tag "${tagName}" not found. Use "dm tag list" to see available tags.`);
        process.exit(1);
      }

      await backend.addTagToTask(taskId, tag.gid);

      console.log(`\n✓ Tag "${tag.name}" added to task`);
      console.log();
    } catch (error) {
      console.error(`✗ Error adding tag to task: ${error}`);
      process.exit(1);
    }
  }

  private async removeTagFromTaskCmd(taskId: string, tagName: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTagBackend();

      // First, find the tag by name
      const tags = await backend.listTags();
      const tag = tags.find((t: Backends.Tag) => t.name.toLowerCase() === tagName.toLowerCase());

      if (!tag) {
        console.error(`✗ Tag "${tagName}" not found. Use "dm tag list" to see available tags.`);
        process.exit(1);
      }

      await backend.removeTagFromTask(taskId, tag.gid);

      console.log(`\n✓ Tag "${tag.name}" removed from task`);
      console.log();
    } catch (error) {
      console.error(`✗ Error removing tag from task: ${error}`);
      process.exit(1);
    }
  }
}
