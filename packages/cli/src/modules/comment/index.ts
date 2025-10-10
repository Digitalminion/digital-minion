import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { OutputFormatter } from '../../output';
import { CommandMetadata } from '../../types/command-metadata';
import { Backends } from '@digital-minion/lib';
import { addMetadataHelp } from '../../utils/command-help';

/**
 * Module for task comment management.
 *
 * Provides commands for adding and listing comments on tasks. Comments enable
 * collaboration and communication about task details, progress, and decisions.
 */
export class CommentModule implements Module {
  name = 'comment';
  description = 'Add and view comments on tasks';

  metadata: CommandMetadata = {
    name: 'comment',
    alias: 'cm',
    summary: 'Add and view comments on tasks',
    description: `Comments provide a way to discuss tasks, ask questions, provide updates, and
document decisions without modifying the task description.`,
    subcommands: [
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all comments on a task',
        description: 'Shows all comments in chronological order with author and timestamp information.',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID to view comments for'
          }
        ],
        examples: [
          {
            description: 'List all comments on a task',
            command: 'dm comment list 1234567890'
          },
          {
            description: 'List comments and parse as JSON',
            command: 'dm -o json comment list 1234567890 | jq \'.comments[]\''
          }
        ],
        notes: [
          'Reviewing discussion history',
          'Finding previous decisions',
          'Catching up on task progress',
          'Understanding context'
        ]
      },
      {
        name: 'add',
        summary: 'Add a comment to a task',
        description: 'Creates a new comment on the specified task. The comment will be attributed to the current Asana user (configured during init).',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID to comment on'
          },
          {
            name: 'text',
            required: true,
            type: 'string',
            description: 'Comment text content'
          }
        ],
        examples: [
          {
            description: 'Add a simple comment',
            command: 'dm comment add 1234567890 "Started working on this"'
          },
          {
            description: 'Add a status update comment',
            command: 'dm comment add 1234567890 "Blocked by API rate limits"'
          },
          {
            description: 'Add a completion comment',
            command: 'dm comment add 1234567890 "Completed testing, ready for review"'
          }
        ],
        notes: [
          'Use quotes around comment text to handle spaces and special characters'
        ]
      }
    ],
    notes: [
      'Progress updates: Share status without changing task fields',
      'Questions: Ask for clarification from team members',
      'Decisions: Document why certain approaches were chosen',
      'Collaboration: Discuss implementation details',
      'Comments are displayed chronologically with author and timestamp information'
    ]
  };

  register(program: Command): void {
    const commentCmd = program
      .command('comment')
      .alias('cm')
      .description(this.metadata.summary);

    // Add progressive help support
    addMetadataHelp(commentCmd, this.metadata);

    commentCmd
      .command('list <taskId>')
      .alias('ls')
      .description(`List all comments on a task

Shows all comments in chronological order with author and timestamp information.

Arguments:
  taskId - The task GID to view comments for

Examples:
  dm comment list 1234567890
  dm -o json comment list 1234567890 | jq '.comments[]'

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
  dm comment add 1234567890 "Started working on this"
  dm comment add 1234567890 "Blocked by API rate limits"
  dm comment add 1234567890 "Completed testing, ready for review"

Agent workflow - add progress update:
  MY_TASKS=$(dm -o json list --agent myname -i | jq -r '.tasks[0].gid')
  dm comment add $MY_TASKS "Made good progress, 80% complete"

TIP: Use quotes around comment text to handle spaces and special characters`)
      .action(async (taskId, text) => {
        await this.addCommentCmd(taskId, text);
      });
  }

  private getBackend() {
    return BackendProvider.getInstance().getCommentBackend();
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
