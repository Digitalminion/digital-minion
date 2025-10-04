import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson, renderHelpText } from '../../types/command-metadata';

/**
 * Module for subtask management.
 *
 * Provides commands for creating and listing subtasks under parent tasks.
 * Subtasks help decompose complex work into smaller, manageable pieces that
 * can be tracked and completed independently.
 */
export class SubtaskModule implements Module {
  name = 'subtask';
  description = 'Break down complex tasks into manageable subtasks';

  metadata: CommandMetadata = {
    name: 'subtask',
    alias: 'st',
    summary: 'Break down complex tasks into manageable subtasks',
    description: `Subtasks help decompose large or complex work into smaller, actionable items.
They're displayed as child items under their parent task and can be completed independently.`,
    subcommands: [
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all subtasks under a parent task',
        description: 'Shows all subtasks belonging to a parent task, including their completion status, names, and due dates.',
        arguments: [
          {
            name: 'parentTaskId',
            required: true,
            type: 'string',
            description: 'The parent task GID'
          }
        ],
        examples: [
          {
            description: 'List all subtasks of a task',
            command: 'dm subtask list 1234567890'
          },
          {
            description: 'List subtasks and parse as JSON',
            command: 'dm -o json subtask list 1234567890 | jq \'.subtasks[]\''
          }
        ],
        notes: [
          'Checking progress on complex tasks',
          'Finding next work item in a larger task',
          'Reviewing all steps in a multi-part task'
        ]
      },
      {
        name: 'add',
        summary: 'Create a subtask under a parent task',
        description: 'Adds a new subtask as a child of an existing task. Great for breaking down complex work into manageable pieces.',
        arguments: [
          {
            name: 'parentTaskId',
            required: true,
            type: 'string',
            description: 'The parent task GID'
          },
          {
            name: 'name',
            required: true,
            type: 'string',
            description: 'Subtask name/title'
          }
        ],
        options: [
          {
            short: '-n',
            long: '--notes',
            description: 'Detailed description',
            takesValue: true,
            valueType: 'string',
            valueName: '<notes>'
          },
          {
            short: '-d',
            long: '--due',
            description: 'Due date (YYYY-MM-DD)',
            takesValue: true,
            valueType: 'string',
            valueName: '<date>'
          }
        ],
        examples: [
          {
            description: 'Create a simple subtask',
            command: 'dm subtask add 1234567890 "Write unit tests"'
          },
          {
            description: 'Create subtask with due date',
            command: 'dm subtask add 1234567890 "Update documentation" --due 2025-12-31'
          },
          {
            description: 'Create subtask with notes',
            command: 'dm subtask add 1234567890 "Code review" --notes "Review PR #123"'
          }
        ]
      },
      {
        name: 'complete',
        summary: 'Mark a subtask as complete',
        description: 'Completes a subtask. This is an alias for "dm task complete <subtaskId>" for better discoverability.',
        arguments: [
          {
            name: 'subtaskId',
            required: true,
            type: 'string',
            description: 'The subtask GID to complete'
          }
        ],
        examples: [
          {
            description: 'Complete a subtask',
            command: 'dm subtask complete 1234567890'
          }
        ],
        relatedCommands: ['task complete']
      }
    ],
    notes: [
      'Track progress granularly (3/5 subtasks complete)',
      'Break down complexity into clear action items',
      'Distribute work across multiple agents',
      'Better estimate effort and track completion',
      'Create subtasks for multi-step work',
      'Each subtask should be completable independently',
      'Use clear, actionable names',
      'Assign subtasks to specific agents when distributing work'
    ]
  };

  register(program: Command): void {
    const subtaskCmd = program
      .command('subtask')
      .alias('st')
      .description(`Break down complex tasks into manageable subtasks

Subtasks help decompose large or complex work into smaller, actionable items.
They're displayed as child items under their parent task and can be completed
independently.

Benefits:
  - Track progress granularly (3/5 subtasks complete)
  - Break down complexity into clear action items
  - Distribute work across multiple agents
  - Better estimate effort and track completion

Best practices:
  - Create subtasks for multi-step work
  - Each subtask should be completable independently
  - Use clear, actionable names
  - Assign subtasks to specific agents when distributing work

Parent tasks show subtask count in list output:
  tasks list -i    # Shows "[3 subtasks]" for tasks with subtasks`);

    // Add metadata help support
    subtaskCmd.option('--help-json', 'Output command help as JSON');

    // Override help to support JSON output
    const originalHelp = subtaskCmd.helpInformation.bind(subtaskCmd);
    subtaskCmd.helpInformation = () => {
      const opts = subtaskCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    subtaskCmd
      .command('list <parentTaskId>')
      .alias('ls')
      .description(`List all subtasks under a parent task

Shows all subtasks belonging to a parent task, including their completion
status, names, and due dates.

Arguments:
  parentTaskId - The parent task GID

Examples:
  tasks subtask list 1234567890
  tasks -o json subtask list 1234567890 | jq '.subtasks[]'

Output shows:
  ○/✓ [GID] Subtask name (due: date)

Useful for:
  - Checking progress on complex tasks
  - Finding next work item in a larger task
  - Reviewing all steps in a multi-part task`)
      .action(async (parentTaskId) => {
        await this.listSubtasksCmd(parentTaskId);
      });

    subtaskCmd
      .command('add <parentTaskId> <name>')
      .description(`Create a subtask under a parent task

Adds a new subtask as a child of an existing task. Great for breaking down
complex work into manageable pieces.

Arguments:
  parentTaskId - The parent task GID
  name         - Subtask name/title

Options:
  -n, --notes <notes>  - Detailed description
  -d, --due <date>     - Due date (YYYY-MM-DD)

Examples:
  tasks subtask add 1234567890 "Write unit tests"
  tasks subtask add 1234567890 "Update documentation" --due 2025-12-31
  tasks subtask add 1234567890 "Code review" --notes "Review PR #123"

Breaking down work workflow:
  # Create parent task
  TASK=$(tasks -o json task add "Implement login feature" | jq -r '.task.gid')

  # Add subtasks for each step
  tasks subtask add $TASK "Design API endpoints"
  tasks subtask add $TASK "Implement authentication logic"
  tasks subtask add $TASK "Write tests"
  tasks subtask add $TASK "Update documentation"

  # Assign subtasks to different agents
  for subtask in $(tasks -o json subtask list $TASK | jq -r '.subtasks[].gid'); do
    tasks assign "$subtask" alice
  done

Complete subtasks with:
  tasks task complete <subtaskId>`)
      .option('-n, --notes <notes>', 'Subtask notes/description')
      .option('-d, --due <date>', 'Due date (YYYY-MM-DD)')
      .action(async (parentTaskId, name, options) => {
        await this.createSubtaskCmd(parentTaskId, name, options);
      });

    subtaskCmd
      .command('complete <subtaskId>')
      .description(`Mark a subtask as complete

This is a convenience alias for "dm task complete <subtaskId>". Subtasks are
regular tasks in Asana, so this command delegates to the task completion logic.

Arguments:
  subtaskId - The subtask GID to complete

Examples:
  dm subtask complete 1234567890
  dm -o json subtask complete 1234567890

Related commands:
  dm task complete - Complete any task (including subtasks)`)
      .action(async (subtaskId) => {
        await this.completeSubtaskCmd(subtaskId);
      });
  }


  private async listSubtasksCmd(parentTaskId: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getSubtaskBackend();
      const subtasks = await backend.listSubtasks(parentTaskId);

      if (subtasks.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ subtasks: [], count: 0 });
        } else {
          console.log('No subtasks found.');
        }
        return;
      }

      OutputFormatter.print(
        { subtasks, count: subtasks.length },
        () => {
          console.log(`\nSubtasks (${subtasks.length}):\n`);
          subtasks.forEach((task: Backends.Task) => {
            const status = task.completed ? '✓' : '○';
            const due = task.dueOn ? ` (due: ${task.dueOn})` : '';
            console.log(`${status} [${task.gid}] ${task.name}${due}`);
            if (task.notes) {
              console.log(`  ${task.notes}`);
            }
          });
          console.log();
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing subtasks: ${error}`);
    }
  }

  private async createSubtaskCmd(parentTaskId: string, name: string, options: any): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getSubtaskBackend();
      const subtask = await backend.createSubtask(parentTaskId, name, options.notes, options.due);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ subtask });
      } else {
        console.log(`\n✓ Subtask created: ${subtask.name} [${subtask.gid}]`);
        if (subtask.notes) console.log(`  Notes: ${subtask.notes}`);
        if (subtask.dueOn) console.log(`  Due: ${subtask.dueOn}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error creating subtask: ${error}`);
    }
  }

  private async completeSubtaskCmd(subtaskId: string): Promise<void> {
    try {
      const taskBackend = BackendProvider.getInstance().getTaskBackend();
      const task = await taskBackend.completeTask(subtaskId);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ task });
      } else {
        console.log(`\n✓ Subtask completed: ${task.name} [${task.gid}]`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error completing subtask: ${error}`);
    }
  }
}
