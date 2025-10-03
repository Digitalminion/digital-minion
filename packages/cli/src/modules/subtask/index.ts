import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { TaskBackend } from '../list/types';
import { AsanaTaskBackend } from '../list/asana-backend';
import { OutputFormatter } from '../../output';

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

  register(program: Command): void {
    const subtaskCmd = program
      .command('subtask')
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

  private async listSubtasksCmd(parentTaskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
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
          subtasks.forEach(task => {
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
      const backend = this.getBackend();
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
}
