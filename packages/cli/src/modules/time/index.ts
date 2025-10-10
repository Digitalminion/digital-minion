import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata } from '../../types/command-metadata';

/**
 * Module for time tracking on tasks.
 *
 * Provides commands for logging time, viewing time entries, and generating
 * time reports for tasks.
 */
export class TimeModule implements Module {
  name = 'time';
  description = 'Track time spent on tasks';

  metadata: CommandMetadata = {
    name: 'time',
    alias: 'tm',
    summary: 'Track time spent on tasks',
    description: `Time tracking allows you to log hours and minutes spent working on tasks, view time entries, and generate reports.`,
    subcommands: [
      {
        name: 'log',
        summary: 'Log time spent on a task',
        description: 'Records a time entry for a task with duration and optional notes.',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID to log time for'
          },
          {
            name: 'duration',
            required: true,
            type: 'string',
            description: 'Duration (e.g., "2h", "30m", "1h30m", "90")'
          }
        ],
        options: [
          {
            short: '-n',
            long: '--notes',
            description: 'Notes about the work done',
            takesValue: true,
            valueType: 'string',
            valueName: '<notes>'
          }
        ],
        examples: [
          {
            description: 'Log 2 hours',
            command: 'dm time log 1234567890 2h'
          },
          {
            description: 'Log 30 minutes',
            command: 'dm time log 1234567890 30m'
          },
          {
            description: 'Log 1.5 hours with notes',
            command: 'dm time log 1234567890 "1h30m" -n "Fixed authentication bug"'
          },
          {
            description: 'Log 90 minutes (as number)',
            command: 'dm time log 1234567890 90'
          }
        ]
      },
      {
        name: 'list',
        alias: 'ls',
        summary: 'List time entries for a task',
        description: 'Shows all time entries logged against a task.',
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
            description: 'List time entries',
            command: 'dm time list 1234567890'
          },
          {
            description: 'List as JSON',
            command: 'dm -o json time list 1234567890'
          }
        ]
      },
      {
        name: 'stats',
        summary: 'Show time tracking statistics for a task',
        description: 'Displays aggregated time statistics including total time, entry count, and breakdown.',
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
            description: 'Show time stats',
            command: 'dm time stats 1234567890'
          },
          {
            description: 'Stats as JSON',
            command: 'dm -o json time stats 1234567890'
          }
        ]
      },
      {
        name: 'delete',
        alias: 'rm',
        summary: 'Delete a time entry',
        description: 'Removes a time entry from a task.',
        arguments: [
          {
            name: 'entryId',
            required: true,
            type: 'string',
            description: 'The time entry GID to delete'
          }
        ],
        examples: [
          {
            description: 'Delete a time entry',
            command: 'dm time delete 9876543210'
          }
        ]
      }
    ],
    notes: [
      'Duration formats: "2h", "30m", "1h30m", or just a number for minutes (e.g., "90")',
      'Time entries are stored as special stories on tasks in Asana',
      'All times are logged in your local timezone'
    ]
  };

  register(program: Command): void {
    const timeCmd = program
      .command('time')
      .alias('tm')
      .description(`Track time spent on tasks

Log hours and minutes against tasks, view time entries, and generate time reports.

Duration formats:
  - Hours: "2h", "1.5h"
  - Minutes: "30m", "90m"
  - Combined: "1h30m", "2h 15m"
  - Number only: "90" (assumed minutes)`);

    timeCmd
      .command('log <taskId> <duration>')
      .description('Log time spent on a task')
      .option('-n, --notes <notes>', 'Notes about the work done')
      .action(async (taskId: string, duration: string, options: any) => {
        await this.logTimeCmd(taskId, duration, options);
      });

    timeCmd
      .command('list <taskId>')
      .alias('ls')
      .description('List time entries for a task')
      .action(async (taskId: string) => {
        await this.listTimeEntriesCmd(taskId);
      });

    timeCmd
      .command('stats <taskId>')
      .description('Show time tracking statistics for a task')
      .action(async (taskId: string) => {
        await this.showStatsCmd(taskId);
      });

    timeCmd
      .command('delete <entryId>')
      .alias('rm')
      .description('Delete a time entry')
      .action(async (entryId: string) => {
        await this.deleteTimeEntryCmd(entryId);
      });
  }

  private async logTimeCmd(taskId: string, duration: string, options: any): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTimeTrackingBackend();

      const entry = await backend.logTimeWithDuration(taskId, duration, options.notes);

      console.log(`\n✓ Time logged: ${this.formatDuration(entry.durationMinutes)}`);
      if (entry.notes) {
        console.log(`  Notes: ${entry.notes}`);
      }
      console.log(`  Entry ID: ${entry.gid}`);
      console.log();
    } catch (error) {
      console.error(`✗ Error logging time: ${error}`);
      process.exit(1);
    }
  }

  private async listTimeEntriesCmd(taskId: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTimeTrackingBackend();
      const entries = await backend.listTimeEntries(taskId);

      if (entries.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ entries: [], count: 0 });
        } else {
          console.log('No time entries found.');
        }
        return;
      }

      OutputFormatter.print(
        { entries, count: entries.length },
        () => {
          console.log(`\nTime Entries (${entries.length}):\n`);
          for (const entry of entries) {
            const date = new Date(entry.createdAt).toLocaleString();
            console.log(`  [${entry.gid}] ${this.formatDuration(entry.durationMinutes)}`);
            console.log(`    Logged: ${date}`);
            if (entry.createdBy) {
              console.log(`    By: ${entry.createdBy}`);
            }
            if (entry.notes) {
              console.log(`    Notes: ${entry.notes}`);
            }
            console.log();
          }
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing time entries: ${error}`);
    }
  }

  private async showStatsCmd(taskId: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTimeTrackingBackend();
      const stats = await backend.getTaskTimeStats(taskId);

      OutputFormatter.print(
        { stats },
        () => {
          console.log(`\nTime Statistics for: ${stats.taskName}`);
          console.log('=' .repeat(50));
          console.log();
          console.log(`Total Time:    ${stats.totalFormatted}`);
          console.log(`Total Minutes: ${stats.totalMinutes}`);
          console.log(`Entries:       ${stats.entryCount}`);

          if (stats.entries.length > 0) {
            console.log(`\nBreakdown:`);
            for (const entry of stats.entries) {
              const date = new Date(entry.createdAt).toLocaleDateString();
              console.log(`  ${date}: ${this.formatDuration(entry.durationMinutes)}`);
              if (entry.notes) {
                console.log(`    └─ ${entry.notes}`);
              }
            }
          }
          console.log();
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error getting time stats: ${error}`);
    }
  }

  private async deleteTimeEntryCmd(entryId: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getTimeTrackingBackend();
      await backend.deleteTimeEntry(entryId);
      console.log(`\n✓ Time entry deleted: ${entryId}\n`);
    } catch (error) {
      console.error(`✗ Error deleting time entry: ${error}`);
      process.exit(1);
    }
  }

  private formatDuration(minutes: number): string {
    if (minutes === 0) return '0m';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }
}
