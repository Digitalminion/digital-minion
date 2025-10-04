import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson } from '../../types/command-metadata';
import { Backends } from '@digital-minion/lib';

/**
 * Module for listing, filtering, and agent assignment of tasks.
 *
 * Provides commands for searching tasks, filtering by various criteria
 * (status, assignee, tags, dates), and managing agent assignments via tags.
 * This is the primary module for finding and assigning work.
 */
export class ListModule implements Module {
  name = 'list';
  description = 'Search and filter tasks (primary command for finding work)';

  metadata: CommandMetadata = {
    name: 'list',
    alias: 'ls',
    summary: 'Search and filter tasks across all criteria',
    description: 'Primary command for finding work and querying tasks. Supports multiple filters that can be combined for precise results. Perfect for agents finding their assigned tasks or specific work items.',
    options: [
      { short: '-c', long: '--completed', description: 'Show only completed tasks', takesValue: false },
      { short: '-i', long: '--incomplete', description: 'Show only incomplete tasks (default behavior)', takesValue: false },
      { long: '--all', description: 'Show all tasks (both completed and incomplete)', takesValue: false },
      { short: '-s', long: '--search', description: 'Search tasks by name or notes content', takesValue: true, valueType: 'string', valueName: '<query>' },
      { short: '-a', long: '--assignee', description: 'Filter by Asana assignee name (for human users)', takesValue: true, valueType: 'string', valueName: '<name>' },
      { long: '--agent', description: 'Filter by agent assignment tag (e.g., --agent becky finds "agent:becky" tags)', takesValue: true, valueType: 'string', valueName: '<agentName>' },
      { long: '--due-from', description: 'Filter tasks due from date (YYYY-MM-DD format)', takesValue: true, valueType: 'string', valueName: '<date>' },
      { long: '--due-to', description: 'Filter tasks due to/before date (YYYY-MM-DD format)', takesValue: true, valueType: 'string', valueName: '<date>' },
      { long: '--tag', description: 'Filter by tag(s) - comma-separated for OR logic', takesValue: true, valueType: 'string', valueName: '<tags>' },
      { short: '-p', long: '--priority', description: 'Filter by priority level', takesValue: true, valueType: 'string', valueName: '<level>', validValues: ['low', 'medium', 'high'] }
    ],
    examples: [
      { description: 'All incomplete tasks', command: 'dm list -i' },
      { description: "Becky's incomplete tasks", command: 'dm list --agent becky -i' },
      { description: 'High priority incomplete tasks', command: 'dm list --tag "priority:high" -i' },
      { description: 'Search incomplete tasks for "bug"', command: 'dm list --search "bug" -i' },
      { description: 'Tasks due by end of year', command: 'dm list --due-to 2025-12-31' },
      { description: 'Get task list as JSON', command: 'dm -o json list --agent myname -i | jq \'.tasks[]\'' }
    ],
    notes: [
      'Use "dm examples agents" for comprehensive agent workflow examples',
      'Default behavior shows only incomplete tasks unless --all or --completed is specified'
    ],
    relatedCommands: ['assign', 'unassign', 'reassign']
  };

  register(program: Command): void {
    // Main list command for searching/filtering tasks
    const listCmd = program
      .command('list')
      .alias('ls')
      .description(`Search and filter tasks across all criteria

Primary command for finding work and querying tasks. Supports multiple filters
that can be combined for precise results. Perfect for agents finding their
assigned tasks or specific work items.

Examples:
  tasks list -i                        # All incomplete tasks
  tasks list --agent becky -i          # Becky's incomplete tasks
  tasks list --tag "priority:high" -i  # High priority incomplete tasks
  tasks list --search "bug" -i         # Search incomplete tasks for "bug"
  tasks list --due-to 2025-12-31       # Tasks due by end of year
  tasks list --priority high -i        # High priority incomplete tasks

For JSON output (recommended for agents):
  tasks -o json list --agent myname -i | jq '.tasks[]'

TIP: Use "tasks examples agents" for comprehensive agent workflow examples`)
      .option('--help-json', 'Output command help as JSON')
      .option('-c, --completed', 'Show only completed tasks')
      .option('-i, --incomplete', 'Show only incomplete tasks (default behavior)')
      .option('--all', 'Show all tasks (both completed and incomplete)')
      .option('-s, --search <query>', 'Search tasks by name or notes content')
      .option('-a, --assignee <name>', 'Filter by Asana assignee name (for human users)')
      .option('--agent <agentName>', 'Filter by agent assignment tag (e.g., --agent becky finds "agent:becky" tags)')
      .option('--due-from <date>', 'Filter tasks due from date (YYYY-MM-DD format)')
      .option('--due-to <date>', 'Filter tasks due to/before date (YYYY-MM-DD format)')
      .option('--tag <tags>', 'Filter by tag(s) - comma-separated for OR logic (e.g., --tag "bug,feature")')
      .option('-p, --priority <level>', 'Filter by priority level (low, medium, high)')
      .action(async (options) => {
        await this.listTasks(options);
      });

    // Override help to support JSON output
    const originalHelp = listCmd.helpInformation.bind(listCmd);
    listCmd.helpInformation = () => {
      const opts = listCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    // Agent assignment commands at top level
    program
      .command('assign <taskId> <agentName>')
      .description(`Assign a task to an agent using tags

Assigns a task to an agent by creating/adding an "agent:agentName" tag.
This allows agents to work without requiring Asana user accounts.

Arguments:
  taskId     - The task GID (from "tasks list" output)
  agentName  - Agent identifier (e.g., "becky", "claude", "alice")

Examples:
  tasks assign 1234567890 becky
  tasks assign 1234567890 \${MY_AGENT_NAME}

After assignment, find tasks with:
  tasks list --agent becky -i`)
      .action(async (taskId, agentName) => {
        await this.assignTaskCmd(taskId, agentName);
      });

    program
      .command('unassign <taskId>')
      .description(`Unassign a task from any agent

Removes all "agent:*" tags from a task, making it unassigned and available
for other agents to pick up.

Arguments:
  taskId - The task GID to unassign

Example:
  tasks unassign 1234567890`)
      .action(async (taskId) => {
        await this.unassignTaskCmd(taskId);
      });

    program
      .command('reassign <taskId> <agentName>')
      .description(`Reassign a task from one agent to another

Removes existing agent assignment and assigns to a new agent in one operation.
Equivalent to unassign + assign.

Arguments:
  taskId    - The task GID to reassign
  agentName - New agent identifier

Example:
  tasks reassign 1234567890 alice`)
      .action(async (taskId, agentName) => {
        await this.reassignTaskCmd(taskId, agentName);
      });
  }

  private async listTasks(options: any): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getListBackend();

      // Build filters from options
      const filters: Backends.ListFilters = {};

      // Filter by completion status
      // Default to showing only incomplete tasks unless --all or --completed is specified
      if (options.completed) {
        filters.completed = true;
      } else if (!options.all) {
        // Default behavior: show only incomplete tasks (includes explicit -i flag)
        filters.completed = false;
      }

      // Search by name/notes
      if (options.search) {
        filters.query = options.search;
      }

      // Filter by assignee
      if (options.assignee) {
        filters.assignee = options.assignee;
      }

      // Filter by agent
      if (options.agent) {
        filters.agent = options.agent;
      }

      // Filter by due date range
      if (options.dueFrom) {
        filters.dueAfter = options.dueFrom;
      }

      if (options.dueTo) {
        filters.dueBefore = options.dueTo;
      }

      // Filter by tags
      if (options.tag) {
        filters.tags = options.tag.split(',').map((t: string) => t.trim());
      }

      // Filter by priority
      if (options.priority) {
        const priorityLevel = options.priority.toLowerCase();
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priorityLevel)) {
          if (OutputFormatter.isJson()) {
            OutputFormatter.print({ error: 'Invalid priority. Must be: low, medium, or high' });
          } else {
            console.error('✗ Invalid priority. Must be: low, medium, or high');
          }
          process.exit(1);
        }
        filters.priority = priorityLevel as 'low' | 'medium' | 'high';
      }

      const filteredTasks = await backend.listTasks(filters);

      if (filteredTasks.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ tasks: [], count: 0 });
        } else {
          console.log('No tasks found matching the criteria.');
        }
        return;
      }

      OutputFormatter.print(
        { tasks: filteredTasks, count: filteredTasks.length },
        () => {
          console.log(`\nTasks (${filteredTasks.length}):\n`);
          filteredTasks.forEach(task => {
            const status = task.completed ? '✓' : '○';
            const due = task.dueOn ? ` (due: ${task.dueOn})` : '';
            const assignee = task.assignee ? ` [@${task.assignee}]` : '';
            const subtasks = task.numSubtasks && task.numSubtasks > 0 ? ` [${task.numSubtasks} subtasks]` : '';

            // Priority indicator
            const priorityEmoji = task.priority === 'high' ? '🔴 ' :
                                  task.priority === 'medium' ? '🟡 ' :
                                  task.priority === 'low' ? '🔵 ' : '';

            // Get section name from memberships (for this project)
            const projectMembership = task.memberships?.find(m => m.section);
            const section = projectMembership ? ` 📂 ${projectMembership.section.name}` : '';

            console.log(`${status} ${priorityEmoji}[${task.gid}] ${task.name}${due}${assignee}${subtasks}${section}`);
            if (task.notes) {
              console.log(`  ${task.notes}`);
            }
            if (task.tags && task.tags.length > 0) {
              console.log(`  Tags: ${task.tags.join(', ')}`);
            }
            if (task.numSubtasks && task.numSubtasks > 0) {
              console.log(`  💡 TIP: View subtasks with "tasks subtask list ${task.gid}"`);
            }
          });
          console.log();
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing tasks: ${error}`);
    }
  }

  private async assignTaskCmd(taskId: string, agentName: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getListBackend();
      const task = await backend.assignAgent(taskId, agentName);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ taskId, agent: agentName, task });
      } else {
        console.log(`\n✓ Task assigned to agent "${agentName}"`);
        console.log(`  Tag added: agent:${agentName}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error assigning task: ${error}`);
    }
  }

  private async unassignTaskCmd(taskId: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getListBackend();
      const task = await backend.unassignAgent(taskId);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ taskId, task });
      } else {
        console.log(`\n✓ Task unassigned from agent`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error unassigning task: ${error}`);
    }
  }

  private async reassignTaskCmd(taskId: string, agentName: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getListBackend();
      const task = await backend.reassignAgent(taskId, agentName);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ taskId, agent: agentName, task });
      } else {
        console.log(`\n✓ Task reassigned to agent "${agentName}"`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error reassigning task: ${error}`);
    }
  }
}
