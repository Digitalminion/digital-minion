import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { TaskBackend } from '../list/types';
import { AsanaTaskBackend } from '../list/asana-backend';
import { OutputFormatter } from '../../output';

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

  register(program: Command): void {
    const tagCmd = program
      .command('tag')
      .description(`Manage tags for organizing and categorizing tasks

Tags are labels you apply to tasks for organization and filtering. Common
tag patterns include:
  - Priority levels:  priority:high, priority:medium, priority:low
  - Modules/Areas:    module:auth, module:api, module:frontend
  - Task types:       bug, feature, refactor, documentation
  - Status markers:   blocked, in-review, ready

Tags enable powerful filtering with "tasks list --tag <name>" to find
specific categories of work.

NOTE: Agent assignments also use tags (agent:name), but are managed via
      "tasks assign" commands for convenience.`);

    tagCmd
      .command('list')
      .alias('ls')
      .description(`List all tags in the workspace

Shows all available tags you can apply to tasks. Use this to:
  - See what organizational tags exist
  - Find the exact tag name for filtering
  - Discover existing categorization schemes

Example:
  tasks tag list
  tasks -o json tag list | jq '.tags[] | .name'

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
  tasks tag create "priority:high"
  tasks tag create "urgent"
  tasks tag create "module:backend"

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
"tasks tag create" first if needed).

Arguments:
  taskId  - The task GID to tag
  tagName - Existing tag name (case-insensitive)

Examples:
  tasks tag add 1234567890 "priority:high"
  tasks tag add 1234567890 bug

Bulk tagging workflow:
  # Tag all incomplete tasks matching a search
  for id in $(tasks -o json list --search "login" -i | jq -r '.tasks[].gid'); do
    tasks tag add "$id" "module:auth"
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
  tasks tag remove 1234567890 "priority:high"
  tasks tag rm 1234567890 bug

NOTE: To remove agent assignments, use "tasks unassign <taskId>" instead`)
      .action(async (taskId, tagName) => {
        await this.removeTagFromTaskCmd(taskId, tagName);
      });
  }

  private getBackend(): TaskBackend {
    const configManager = new ConfigManager();
    const config = configManager.load();

    if (!config) {
      console.error('✗ No configuration found. Please run "tasks init" first.');
      process.exit(1);
    }

    if (config.backend === 'asana') {
      if (!config.asana) {
        console.error('✗ Asana configuration not found. Please run "tasks init" again.');
        process.exit(1);
      }
      return new AsanaTaskBackend(config.asana);
    } else {
      console.error('✗ Local backend not yet implemented.');
      process.exit(1);
    }
  }

  private async listTagsCmd(): Promise<void> {
    try {
      const backend = this.getBackend();
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
          tags.forEach(tag => {
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
      const backend = this.getBackend();
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
      const backend = this.getBackend();

      // First, find the tag by name
      const tags = await backend.listTags();
      const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

      if (!tag) {
        console.error(`✗ Tag "${tagName}" not found. Use "tasks tag list" to see available tags.`);
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
      const backend = this.getBackend();

      // First, find the tag by name
      const tags = await backend.listTags();
      const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

      if (!tag) {
        console.error(`✗ Tag "${tagName}" not found. Use "tasks tag list" to see available tags.`);
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
