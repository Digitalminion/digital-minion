import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson } from '../../types/command-metadata';
import { Backends } from '@digital-minion/lib';

/**
 * Module for managing task dependencies.
 */
export class DependencyModule implements Module {
  name = 'dependency';
  description = 'Manage task dependencies and blocking relationships';

  metadata: CommandMetadata = {
    name: 'dependency',
    alias: 'dep',
    summary: 'Manage task dependencies and blocking relationships',
    description: `Task dependencies define which tasks must be completed before others can start.
Use this to model workflows and ensure proper task sequencing.

Terminology:
  - "Task A depends on Task B" = Task B must complete before Task A can start
  - "Task B blocks Task A" = Task A cannot start until Task B is complete`,
    subcommands: [
      {
        name: 'add',
        summary: 'Add a dependency relationship',
        description: 'Makes taskId depend on dependsOnTaskId (dependsOnTaskId must complete first).',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task that has a dependency'
          },
          {
            name: 'dependsOnTaskId',
            required: true,
            type: 'string',
            description: 'The task that must complete first'
          }
        ],
        examples: [
          {
            description: 'Add a dependency between two tasks',
            command: 'dm dependency add 111 222'
          },
          {
            description: 'Task 111 now depends on task 222 (222 must complete before 111 can start)',
            command: 'dm dependency add 111 222'
          }
        ]
      },
      {
        name: 'remove',
        alias: 'rm',
        summary: 'Remove a dependency relationship',
        description: 'Removes the dependency relationship between two tasks.',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task with the dependency'
          },
          {
            name: 'dependsOnTaskId',
            required: true,
            type: 'string',
            description: 'The task to remove the dependency from'
          }
        ],
        examples: [
          {
            description: 'Remove a dependency between two tasks',
            command: 'dm dependency remove 111 222'
          }
        ]
      },
      {
        name: 'show',
        summary: 'Show all dependencies and dependents for a task',
        description: `Displays what this task depends on (blocking tasks) and what depends on this task (blocked tasks).`,
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID'
          }
        ],
        examples: [
          {
            description: 'Show all dependencies for a task',
            command: 'dm dependency show 1234567890'
          },
          {
            description: 'Show dependencies and parse as JSON',
            command: 'dm -o json dependency show 1234567890 | jq \'.dependencies[]\''
          }
        ],
        notes: [
          'View blocking relationships before starting work',
          'Understand task ordering in complex workflows',
          'Identify circular dependencies'
        ]
      }
    ],
    notes: [
      'Use dependencies to model sequential workflows',
      'Blocked tasks should not be started until blockers complete',
      'Avoid circular dependencies (A depends on B, B depends on A)',
      'Dependencies help agents understand task ordering',
      'Use "depends on" for tasks that require prior completion',
      'Check dependencies before assigning work to ensure prerequisites are met'
    ]
  };

  register(program: Command): void {
    const depCmd = program
      .command('dependency')
      .alias('dep')
      .description(`Manage task dependencies and blocking relationships

Task dependencies define which tasks must be completed before others can start.
Use this to model workflows and ensure proper task sequencing.

Terminology:
  - "Task A depends on Task B" = Task B must complete before Task A can start
  - "Task B blocks Task A" = Task A cannot start until Task B is complete`);

    // Add metadata help support
    depCmd.option('--help-json', 'Output command help as JSON');

    // Override help to support JSON output
    const originalHelp = depCmd.helpInformation.bind(depCmd);
    depCmd.helpInformation = () => {
      const opts = depCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    depCmd
      .command('add <taskId> <dependsOnTaskId>')
      .description(`Add a dependency relationship

Makes taskId depend on dependsOnTaskId (dependsOnTaskId must complete first).

Arguments:
  taskId          - The task that has a dependency
  dependsOnTaskId - The task that must complete first

Example:
  dm dependency add 111 222
  # Task 111 now depends on task 222 (222 must complete before 111 can start)`)
      .action(async (taskId, dependsOnTaskId) => {
        await this.addDependency(taskId, dependsOnTaskId);
      });

    depCmd
      .command('remove <taskId> <dependsOnTaskId>')
      .alias('rm')
      .description(`Remove a dependency relationship

Arguments:
  taskId          - The task with the dependency
  dependsOnTaskId - The task to remove the dependency from

Example:
  dm dependency remove 111 222`)
      .action(async (taskId, dependsOnTaskId) => {
        await this.removeDependency(taskId, dependsOnTaskId);
      });

    depCmd
      .command('show <taskId>')
      .description(`Show all dependencies and dependents for a task

Displays:
  - What this task depends on (blocking tasks)
  - What depends on this task (blocked tasks)

Arguments:
  taskId - The task GID

Example:
  dm dependency show 1234567890`)
      .action(async (taskId) => {
        await this.showDependencies(taskId);
      });
  }

  private getBackend() {
    return BackendProvider.getInstance().getDependencyBackend();
  }

  private async addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      await backend.addDependency(taskId, dependsOnTaskId);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ success: true, taskId, dependsOnTaskId });
      } else {
        console.log(`\n✓ Dependency added`);
        console.log(`  Task ${taskId} now depends on task ${dependsOnTaskId}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error adding dependency: ${error}`);
    }
  }

  private async removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      await backend.removeDependency(taskId, dependsOnTaskId);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ success: true, taskId, dependsOnTaskId });
      } else {
        console.log(`\n✓ Dependency removed`);
        console.log(`  Task ${taskId} no longer depends on task ${dependsOnTaskId}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error removing dependency: ${error}`);
    }
  }

  private async showDependencies(taskId: string): Promise<void> {
    try {
      const taskBackend = BackendProvider.getInstance().getTaskBackend();
      const task = await taskBackend.getTask(taskId);

      const dependencies = task.dependencies || [];
      const dependents = task.dependents || [];

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({
          task: { gid: task.gid, name: task.name },
          dependencies,
          dependents,
          dependencyCount: dependencies.length,
          dependentCount: dependents.length,
        });
      } else {
        console.log(`\nDependencies for: ${task.name} [${task.gid}]\n`);

        if (dependencies.length > 0) {
          console.log(`This task depends on (${dependencies.length}):`);
          dependencies.forEach(dep => console.log(`  - ${dep}`));
          console.log();
        } else {
          console.log('This task has no dependencies.\n');
        }

        if (dependents.length > 0) {
          console.log(`Tasks that depend on this (${dependents.length}):`);
          dependents.forEach(dep => console.log(`  - ${dep}`));
          console.log();
        } else {
          console.log('No tasks depend on this one.\n');
        }
      }
    } catch (error) {
      OutputFormatter.error(`Error showing dependencies: ${error}`);
    }
  }
}
