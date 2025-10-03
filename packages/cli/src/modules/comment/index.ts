import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { TaskBackend } from '../list/types';
import { AsanaTaskBackend } from '../list/asana-backend';
import { OutputFormatter } from '../../output';

/**
 * Module for task comment management.
 *
 * Provides commands for adding and listing comments on tasks. Comments enable
 * collaboration and communication about task details, progress, and decisions.
 */
export class CommentModule implements Module {
  name = 'comment';
  description = 'Add and view comments on tasks';

  register(program: Command): void {
    const commentCmd = program
      .command('comment')
      .description(`Add and view comments on tasks

Comments provide a way to discuss tasks, ask questions, provide updates, and
document decisions without modifying the task description.

Use cases:
  - Progress updates: Share status without changing task fields
  - Questions: Ask for clarification from team members
  - Decisions: Document why certain approaches were chosen
  - Collaboration: Discuss implementation details

Comments are displayed chronologically with author and timestamp information.`);

    commentCmd
      .command('list <taskId>')
      .alias('ls')
      .description(`List all comments on a task

Shows all comments in chronological order with author and timestamp information.

Arguments:
  taskId - The task GID to view comments for

Examples:
  tasks comment list 1234567890
  tasks -o json comment list 1234567890 | jq '.comments[]'

Useful for:
  - Reviewing discussion history
  - Finding previous decisions
  - Catching up on task progress
  - Understanding context`)
      .action(async (taskId) => {
        await this.listCommentsCmd(taskId);
      });

    commentCmd
      .command('add <taskId> <text>')
      .description(`Add a comment to a task

Creates a new comment on the specified task. The comment will be attributed
to the current Asana user (configured during init).

Arguments:
  taskId - The task GID to comment on
  text   - Comment text content

Examples:
  tasks comment add 1234567890 "Started working on this"
  tasks comment add 1234567890 "Blocked by API rate limits"
  tasks comment add 1234567890 "Completed testing, ready for review"

Agent workflow - add progress update:
  MY_TASKS=$(tasks -o json list --agent myname -i | jq -r '.tasks[0].gid')
  tasks comment add $MY_TASKS "Made good progress, 80% complete"

TIP: Use quotes around comment text to handle spaces and special characters`)
      .action(async (taskId, text) => {
        await this.addCommentCmd(taskId, text);
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

  private async listCommentsCmd(taskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const comments = await backend.listComments(taskId);

      if (comments.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ comments: [], count: 0 });
        } else {
          console.log('\nNo comments found.');
          console.log();
        }
        return;
      }

      OutputFormatter.print(
        { comments, count: comments.length },
        () => {
          console.log(`\nComments (${comments.length}):\n`);
          comments.forEach(comment => {
            const author = comment.createdBy || 'Unknown';
            const date = comment.createdAt
              ? new Date(comment.createdAt).toLocaleString()
              : 'Unknown date';

            console.log(`[${comment.gid}] ${author} - ${date}`);
            console.log(`  ${comment.text}`);
            console.log();
          });
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing comments: ${error}`);
    }
  }

  private async addCommentCmd(taskId: string, text: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const comment = await backend.createComment(taskId, text);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ comment });
      } else {
        console.log(`\n✓ Comment added to task`);
        console.log(`  ${comment.text}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error adding comment: ${error}`);
    }
  }
}
