import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { TaskBackend } from './types';
import { AsanaTaskBackend } from './asana-backend';
import { OutputFormatter } from '../../output';

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

  register(program: Command): void {
    // Main list command for searching/filtering tasks
    program
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
      .option('-c, --completed', 'Show only completed tasks')
      .option('-i, --incomplete', 'Show only incomplete tasks (most common for finding work)')
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

  private async listTasks(options: any): Promise<void> {
    try {
      const backend = this.getBackend();
      const tasks = await backend.listTasks();

      let filteredTasks = tasks;

      // Filter by completion status
      if (options.completed) {
        filteredTasks = filteredTasks.filter(t => t.completed);
      } else if (options.incomplete) {
        filteredTasks = filteredTasks.filter(t => !t.completed);
      }

      // Search by name
      if (options.search) {
        const query = options.search.toLowerCase();
        filteredTasks = filteredTasks.filter(t =>
          t.name.toLowerCase().includes(query) ||
          (t.notes && t.notes.toLowerCase().includes(query))
        );
      }

      // Filter by assignee
      if (options.assignee) {
        const assigneeQuery = options.assignee.toLowerCase();
        filteredTasks = filteredTasks.filter(t =>
          t.assignee && t.assignee.toLowerCase().includes(assigneeQuery)
        );
      }

      // Filter by agent (searches for "agent:agentName" tag)
      if (options.agent) {
        const agentTag = `agent:${options.agent.toLowerCase()}`;
        filteredTasks = filteredTasks.filter(t =>
          t.tags && t.tags.some((tag: string) => tag.toLowerCase() === agentTag)
        );
      }

      // Filter by due date range
      if (options.dueFrom) {
        filteredTasks = filteredTasks.filter(t =>
          t.dueOn && t.dueOn >= options.dueFrom
        );
      }

      if (options.dueTo) {
        filteredTasks = filteredTasks.filter(t =>
          t.dueOn && t.dueOn <= options.dueTo
        );
      }

      // Filter by tags
      if (options.tag) {
        const filterTags = options.tag.split(',').map((t: string) => t.trim().toLowerCase());
        filteredTasks = filteredTasks.filter(t =>
          t.tags && t.tags.some((tag: string) =>
            filterTags.some((filterTag: string) => tag.toLowerCase().includes(filterTag))
          )
        );
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
        filteredTasks = filteredTasks.filter(t => t.priority === priorityLevel);
      }

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
      const backend = this.getBackend();
      const tagName = `agent:${agentName}`;

      // Check if tag already exists, create if not
      const tags = await backend.listTags();
      let agentTag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

      if (!agentTag) {
        agentTag = await backend.createTag(tagName);
      }

      // Add tag to task
      await backend.addTagToTask(taskId, agentTag.gid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ taskId, agent: agentName, tag: agentTag.name });
      } else {
        console.log(`\n✓ Task assigned to agent "${agentName}"`);
        console.log(`  Tag added: ${agentTag.name}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error assigning task: ${error}`);
    }
  }

  private async unassignTaskCmd(taskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const task = await backend.getTask(taskId);

      // Find all "agent:*" tags
      const agentTags = task.tags?.filter(tagName => tagName.toLowerCase().startsWith('agent:')) || [];

      if (agentTags.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ taskId, message: 'No agent assignment found' });
        } else {
          console.log('\n⚠ Task is not assigned to any agent');
          console.log();
        }
        return;
      }

      // Get all tags to find GIDs
      const allTags = await backend.listTags();

      for (const agentTagName of agentTags) {
        const tag = allTags.find(t => t.name.toLowerCase() === agentTagName.toLowerCase());
        if (tag) {
          await backend.removeTagFromTask(taskId, tag.gid);
        }
      }

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ taskId, removedTags: agentTags });
      } else {
        console.log(`\n✓ Task unassigned from agent`);
        console.log(`  Removed tags: ${agentTags.join(', ')}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error unassigning task: ${error}`);
    }
  }

  private async reassignTaskCmd(taskId: string, agentName: string): Promise<void> {
    try {
      // First unassign, then assign to new agent
      await this.unassignTaskCmd(taskId);
      await this.assignTaskCmd(taskId, agentName);
    } catch (error) {
      OutputFormatter.error(`Error reassigning task: ${error}`);
    }
  }
}
