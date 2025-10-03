import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { TaskBackend } from '../list/types';
import { AsanaTaskBackend } from '../list/asana-backend';
import { OutputFormatter } from '../../output';

/**
 * Module for individual task CRUD operations.
 *
 * Provides commands for creating, reading, updating, deleting, and completing
 * individual tasks. Includes support for task metadata like notes, due dates,
 * and tags.
 */
export class TaskModule implements Module {
  name = 'task';
  description = 'Create, update, and manage individual tasks (CRUD operations)';

  register(program: Command): void {
    const taskCmd = program
      .command('task')
      .description(`Create, update, and manage individual tasks

Complete CRUD operations for task lifecycle management. Use these commands
to create new work items, update existing tasks, mark work complete, or
remove tasks entirely.

Common workflow:
  1. Create task:  tasks task add "Task name" --notes "Details"
  2. Assign it:    tasks assign <taskId> myname
  3. Work on it:   tasks list --agent myname -i
  4. Complete it:  tasks task complete <taskId>

TIP: For complex work, break tasks into subtasks with "tasks subtask add"`);

    // Add a new task
    taskCmd
      .command('add <name>')
      .description(`Create a new task

Creates a new task in the project. Returns the task GID which you can use
for further operations (assign, tag, update, etc.).

Arguments:
  name - Task name/title (required)

Options:
  -n, --notes <notes>      - Detailed description or notes
  -d, --due <date>         - Due date in YYYY-MM-DD format
  -p, --priority <level>   - Set priority (low, medium, high)
  --tags <tags>            - Comma-separated tag names to add (tags must exist)

Examples:
  tasks task add "Implement login feature"
  tasks task add "Fix bug #123" --notes "User reported crash" --due 2025-12-31
  tasks task add "Review PR" --tags "priority:high,review"
  tasks task add "Critical fix" --priority high --due 2025-12-31

TIP: Create task, then immediately assign:
  TASK_ID=$(tasks -o json task add "My task" | jq -r '.task.gid')
  tasks assign $TASK_ID myname`)
      .option('-n, --notes <notes>', 'Task notes/description')
      .option('-d, --due <date>', 'Due date (YYYY-MM-DD)')
      .option('-p, --priority <level>', 'Set priority (low, medium, high)')
      .option('--tags <tags>', 'Comma-separated list of tag names (must already exist)')
      .action(async (name, options) => {
        await this.addTask(name, options);
      });

    // Update a task
    taskCmd
      .command('update <taskId>')
      .description(`Update an existing task

Modify task properties like name, notes, due date, priority, or add tags. Only
updates the fields you specify - other fields remain unchanged.

Arguments:
  taskId - The task GID to update

Options:
  -t, --title <title>      - New task name/title
  --notes <notes>          - New task notes/description
  -d, --due <date>         - New due date (YYYY-MM-DD)
  -p, --priority <level>   - Set priority (low, medium, high)
  --tags <tags>            - Comma-separated tag names to ADD (doesn't remove existing)

Examples:
  tasks task update 1234567890 --title "New name"
  tasks task update 1234567890 --due 2025-12-31
  tasks task update 1234567890 --priority high
  tasks task update 1234567890 --tags "urgent,reviewed"`)
      .option('-t, --title <title>', 'New task name')
      .option('--notes <notes>', 'New task notes')
      .option('-d, --due <date>', 'New due date (YYYY-MM-DD)')
      .option('-p, --priority <level>', 'Set priority (low, medium, high)')
      .option('--tags <tags>', 'Comma-separated list of tag names to add')
      .action(async (taskId, options) => {
        await this.updateTask(taskId, options);
      });

    // Delete a task
    taskCmd
      .command('delete <taskId>')
      .alias('rm')
      .description(`Delete a task permanently

Permanently removes a task. This cannot be undone. Use with caution.

Arguments:
  taskId - The task GID to delete

Example:
  tasks task delete 1234567890

WARNING: This is permanent and cannot be undone`)
      .action(async (taskId) => {
        await this.deleteTask(taskId);
      });

    // Complete a task
    taskCmd
      .command('complete <taskId>')
      .description(`Mark a task as complete

Marks a task as completed. This is the standard way to indicate work is done.

Arguments:
  taskId - The task GID to complete

Example:
  tasks task complete 1234567890

Agent workflow - complete current task and find next:
  tasks task complete 1234567890
  NEXT=$(tasks -o json list --agent myname -i | jq -r '.tasks[0].gid')
  echo "Next task: $NEXT"`)
      .action(async (taskId) => {
        await this.completeTask(taskId);
      });

    // Get task details
    taskCmd
      .command('get <taskId>')
      .description(`Get detailed information about a specific task

Retrieves all details about a task including name, notes, due date, tags,
section, assignee, and subtask count.

Arguments:
  taskId - The task GID to fetch

Example:
  tasks task get 1234567890
  tasks -o json task get 1234567890 | jq '.task'

Useful for:
  - Checking task details before working on it
  - Verifying task state after updates
  - Getting full context in JSON for processing`)
      .action(async (taskId) => {
        await this.getTask(taskId);
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

  private async addTask(name: string, options: any): Promise<void> {
    try {
      const backend = this.getBackend();

      // Validate priority if specified
      if (options.priority) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(options.priority.toLowerCase())) {
          console.error('✗ Invalid priority. Must be: low, medium, or high');
          process.exit(1);
        }
      }

      const task = await backend.createTask(
        name,
        options.notes,
        options.due,
        options.priority ? options.priority.toLowerCase() : undefined
      );

      // Add tags if specified
      const warnings: string[] = [];
      if (options.tags) {
        const tagNames = options.tags.split(',').map((t: string) => t.trim());
        const allTags = await backend.listTags();

        for (const tagName of tagNames) {
          const tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
          if (tag) {
            await backend.addTagToTask(task.gid, tag.gid);
          } else {
            warnings.push(`Tag "${tagName}" not found and was not added`);
          }
        }
      }

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ task, warnings: warnings.length > 0 ? warnings : undefined });
      } else {
        console.log(`\n✓ Task created: ${task.name} [${task.gid}]`);
        if (task.notes) console.log(`  Notes: ${task.notes}`);
        if (task.dueOn) console.log(`  Due: ${task.dueOn}`);
        if (task.priority) console.log(`  Priority: ${task.priority}`);
        if (options.tags) console.log(`  Tags: ${options.tags}`);
        warnings.forEach(w => console.log(`  ⚠ ${w}`));
        console.log(`  💡 TIP: Break this down? Add subtasks with "tasks subtask add ${task.gid} <name>"`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error creating task: ${error}`);
    }
  }

  private async updateTask(taskId: string, options: any): Promise<void> {
    try {
      const backend = this.getBackend();
      const updates: any = {};

      if (options.title) updates.name = options.title;
      if (options.notes) updates.notes = options.notes;
      if (options.due) updates.dueOn = options.due;
      if (options.priority) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(options.priority.toLowerCase())) {
          console.error('✗ Invalid priority. Must be: low, medium, or high');
          process.exit(1);
        }
        updates.priority = options.priority.toLowerCase();
      }

      if (Object.keys(updates).length === 0 && !options.tags) {
        console.error('✗ No updates specified. Use --title, --notes, --due, --priority, or --tags.');
        process.exit(1);
      }

      let task = null;
      if (Object.keys(updates).length > 0) {
        task = await backend.updateTask(taskId, updates);
      }

      // Add tags if specified
      if (options.tags) {
        const tagNames = options.tags.split(',').map((t: string) => t.trim());
        const allTags = await backend.listTags();

        for (const tagName of tagNames) {
          const tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
          if (tag) {
            await backend.addTagToTask(taskId, tag.gid);
          } else {
            console.log(`  ⚠ Tag "${tagName}" not found and was not added`);
          }
        }
      }

      // Fetch task info for display if we haven't already
      if (!task) {
        task = await backend.getTask(taskId);
      }

      console.log(`\n✓ Task updated: ${task.name}`);
      if (options.tags) console.log(`  Tags added: ${options.tags}`);
      console.log();
    } catch (error) {
      console.error(`✗ Error updating task: ${error}`);
      process.exit(1);
    }
  }

  private async deleteTask(taskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      await backend.deleteTask(taskId);

      console.log(`\n✓ Task deleted`);
      console.log();
    } catch (error) {
      console.error(`✗ Error deleting task: ${error}`);
      process.exit(1);
    }
  }

  private async completeTask(taskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const task = await backend.completeTask(taskId);

      console.log(`\n✓ Task completed: ${task.name}`);
      console.log();
    } catch (error) {
      console.error(`✗ Error completing task: ${error}`);
      process.exit(1);
    }
  }

  private async getTask(taskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const task = await backend.getTask(taskId);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ task });
      } else {
        const status = task.completed ? '✓' : '○';
        console.log(`\n${status} ${task.name} [${task.gid}]`);
        if (task.notes) console.log(`  Notes: ${task.notes}`);
        if (task.dueOn) console.log(`  Due: ${task.dueOn}`);
        if (task.assignee) console.log(`  Assignee: ${task.assignee}`);
        if (task.tags && task.tags.length > 0) console.log(`  Tags: ${task.tags.join(', ')}`);
        if (task.parent) console.log(`  Parent: ${task.parent}`);
        if (task.numSubtasks && task.numSubtasks > 0) {
          console.log(`  Subtasks: ${task.numSubtasks}`);
          console.log(`  💡 TIP: View subtasks with "tasks subtask list ${task.gid}"`);
        }
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error getting task: ${error}`);
    }
  }
}
