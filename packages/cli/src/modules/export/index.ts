import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { OutputFormatter } from '../../output';
import { CommandMetadata } from '../../types/command-metadata';
import { Backends } from '@digital-minion/lib';
import { addMetadataHelp } from '../../utils/command-help';

/**
 * Module for exporting tasks to various formats.
 *
 * Provides commands for exporting task data to CSV, JSON, and Markdown formats.
 * Supports filtering and customization of exported data. Useful for reporting,
 * backup, and integration with other tools.
 */
export class ExportModule implements Module {
  name = 'export';
  description = 'Export tasks to various formats (CSV, JSON, Markdown)';

  metadata: CommandMetadata = {
    name: 'export',
    alias: 'ex',
    summary: 'Export tasks to various formats (CSV, JSON, Markdown)',
    description: `Export task data to CSV, JSON, or Markdown formats for reporting, backup,
or integration with other tools. Supports filtering by the same criteria
as the list command.`,
    subcommands: [
      {
        name: 'csv',
        summary: 'Export tasks to CSV format',
        description: 'Creates a comma-separated values file suitable for importing into spreadsheet applications like Excel, Google Sheets, or for processing with data tools.',
        arguments: [
          {
            name: 'filename',
            required: true,
            type: 'string',
            description: 'Output file path (e.g., tasks.csv)'
          }
        ],
        options: [
          {
            short: '-c',
            long: '--completed',
            description: 'Export only completed tasks',
            takesValue: false
          },
          {
            short: '-i',
            long: '--incomplete',
            description: 'Export only incomplete tasks',
            takesValue: false
          },
          {
            short: '-s',
            long: '--search',
            description: 'Search tasks by name or notes',
            takesValue: true,
            valueType: 'string',
            valueName: '<query>'
          },
          {
            short: '-a',
            long: '--assignee',
            description: 'Filter by Asana assignee name',
            takesValue: true,
            valueType: 'string',
            valueName: '<name>'
          },
          {
            long: '--agent',
            description: 'Filter by agent assignment tag',
            takesValue: true,
            valueType: 'string',
            valueName: '<agentName>'
          },
          {
            long: '--due-from',
            description: 'Filter tasks due from date (YYYY-MM-DD)',
            takesValue: true,
            valueType: 'string',
            valueName: '<date>'
          },
          {
            long: '--due-to',
            description: 'Filter tasks due to/before date (YYYY-MM-DD)',
            takesValue: true,
            valueType: 'string',
            valueName: '<date>'
          },
          {
            long: '--tag',
            description: 'Filter by tag(s) - comma-separated',
            takesValue: true,
            valueType: 'string',
            valueName: '<tags>'
          },
          {
            short: '-p',
            long: '--priority',
            description: 'Filter by priority (low, medium, high)',
            takesValue: true,
            valueType: 'string',
            valueName: '<level>'
          }
        ],
        examples: [
          {
            description: 'Export all tasks to CSV',
            command: 'dm export csv all-tasks.csv'
          },
          {
            description: 'Export incomplete tasks only',
            command: 'dm export csv incomplete.csv -i'
          },
          {
            description: 'Export agent-specific tasks',
            command: 'dm export csv agent-tasks.csv --agent becky -i'
          },
          {
            description: 'Export high-priority bugs',
            command: 'dm export csv high-priority.csv --priority high --tag "bug"'
          }
        ]
      },
      {
        name: 'json',
        summary: 'Export tasks to JSON format',
        description: 'Creates a JSON file with complete task data for programmatic processing, backup, or integration with other systems.',
        arguments: [
          {
            name: 'filename',
            required: true,
            type: 'string',
            description: 'Output file path (e.g., tasks.json)'
          }
        ],
        options: [
          {
            short: '-c',
            long: '--completed',
            description: 'Export only completed tasks',
            takesValue: false
          },
          {
            short: '-i',
            long: '--incomplete',
            description: 'Export only incomplete tasks',
            takesValue: false
          },
          {
            short: '-s',
            long: '--search',
            description: 'Search tasks by name or notes',
            takesValue: true,
            valueType: 'string',
            valueName: '<query>'
          },
          {
            short: '-a',
            long: '--assignee',
            description: 'Filter by Asana assignee name',
            takesValue: true,
            valueType: 'string',
            valueName: '<name>'
          },
          {
            long: '--agent',
            description: 'Filter by agent assignment tag',
            takesValue: true,
            valueType: 'string',
            valueName: '<agentName>'
          },
          {
            long: '--due-from',
            description: 'Filter tasks due from date (YYYY-MM-DD)',
            takesValue: true,
            valueType: 'string',
            valueName: '<date>'
          },
          {
            long: '--due-to',
            description: 'Filter tasks due to/before date (YYYY-MM-DD)',
            takesValue: true,
            valueType: 'string',
            valueName: '<date>'
          },
          {
            long: '--tag',
            description: 'Filter by tag(s) - comma-separated',
            takesValue: true,
            valueType: 'string',
            valueName: '<tags>'
          },
          {
            short: '-p',
            long: '--priority',
            description: 'Filter by priority (low, medium, high)',
            takesValue: true,
            valueType: 'string',
            valueName: '<level>'
          }
        ],
        examples: [
          {
            description: 'Export all tasks to JSON',
            command: 'dm export json backup.json'
          },
          {
            description: 'Export incomplete tasks only',
            command: 'dm export json incomplete.json -i'
          },
          {
            description: 'Export tasks for multiple agents',
            command: 'dm export json team-tasks.json --agent alice --agent bob'
          }
        ]
      },
      {
        name: 'markdown',
        alias: 'md',
        summary: 'Export tasks to Markdown format',
        description: 'Creates a human-readable Markdown document with task data organized by sections and status. Great for documentation and reports.',
        arguments: [
          {
            name: 'filename',
            required: true,
            type: 'string',
            description: 'Output file path (e.g., report.md)'
          }
        ],
        options: [
          {
            short: '-c',
            long: '--completed',
            description: 'Export only completed tasks',
            takesValue: false
          },
          {
            short: '-i',
            long: '--incomplete',
            description: 'Export only incomplete tasks',
            takesValue: false
          },
          {
            short: '-s',
            long: '--search',
            description: 'Search tasks by name or notes',
            takesValue: true,
            valueType: 'string',
            valueName: '<query>'
          },
          {
            short: '-a',
            long: '--assignee',
            description: 'Filter by Asana assignee name',
            takesValue: true,
            valueType: 'string',
            valueName: '<name>'
          },
          {
            long: '--agent',
            description: 'Filter by agent assignment tag',
            takesValue: true,
            valueType: 'string',
            valueName: '<agentName>'
          },
          {
            long: '--due-from',
            description: 'Filter tasks due from date (YYYY-MM-DD)',
            takesValue: true,
            valueType: 'string',
            valueName: '<date>'
          },
          {
            long: '--due-to',
            description: 'Filter tasks due to/before date (YYYY-MM-DD)',
            takesValue: true,
            valueType: 'string',
            valueName: '<date>'
          },
          {
            long: '--tag',
            description: 'Filter by tag(s) - comma-separated',
            takesValue: true,
            valueType: 'string',
            valueName: '<tags>'
          },
          {
            short: '-p',
            long: '--priority',
            description: 'Filter by priority (low, medium, high)',
            takesValue: true,
            valueType: 'string',
            valueName: '<level>'
          }
        ],
        examples: [
          {
            description: 'Export incomplete tasks to Markdown report',
            command: 'dm export markdown sprint-report.md -i'
          },
          {
            description: 'Export tasks due by end of year',
            command: 'dm export md weekly-tasks.md --due-to 2025-12-31'
          },
          {
            description: 'Export team status report',
            command: 'dm export markdown team-status.md --agent team'
          }
        ]
      }
    ],
    notes: [
      'Spreadsheet-compatible CSV format for Excel, Google Sheets',
      'Machine-readable JSON format for programmatic processing',
      'Human-readable Markdown format for documentation',
      'All filtering options from list command are supported',
      'Use for reporting, backup, and integration with other tools',
      'No file created if no tasks match filter criteria'
    ]
  };

  register(program: Command): void {
    const exportCmd = program
      .command('export')
      .alias('ex')
      .description(this.metadata.summary);

    // Add progressive help support
    addMetadataHelp(exportCmd, this.metadata);

    exportCmd
      .command('csv <filename>')
      .description(`Export tasks to CSV format

Creates a comma-separated values file suitable for importing into spreadsheet
applications like Excel, Google Sheets, or for processing with data tools.

Arguments:
  filename - Output file path (e.g., tasks.csv)

Options:
  All filtering options from 'list' command are supported

Examples:
  dm export csv all-tasks.csv
  dm export csv incomplete.csv -i
  dm export csv agent-tasks.csv --agent becky -i
  dm export csv high-priority.csv --priority high --tag "bug"`)
      .option('-c, --completed', 'Export only completed tasks')
      .option('-i, --incomplete', 'Export only incomplete tasks')
      .option('-s, --search <query>', 'Search tasks by name or notes')
      .option('-a, --assignee <name>', 'Filter by Asana assignee name')
      .option('--agent <agentName>', 'Filter by agent assignment tag')
      .option('--due-from <date>', 'Filter tasks due from date (YYYY-MM-DD)')
      .option('--due-to <date>', 'Filter tasks due to/before date (YYYY-MM-DD)')
      .option('--tag <tags>', 'Filter by tag(s) - comma-separated')
      .option('-p, --priority <level>', 'Filter by priority (low, medium, high)')
      .action(async (filename, options) => {
        await this.exportCSV(filename, options);
      });

    exportCmd
      .command('json <filename>')
      .description(`Export tasks to JSON format

Creates a JSON file with complete task data for programmatic processing,
backup, or integration with other systems.

Arguments:
  filename - Output file path (e.g., tasks.json)

Options:
  All filtering options from 'list' command are supported

Examples:
  dm export json backup.json
  dm export json incomplete.json -i
  dm export json team-tasks.json --agent alice --agent bob`)
      .option('-c, --completed', 'Export only completed tasks')
      .option('-i, --incomplete', 'Export only incomplete tasks')
      .option('-s, --search <query>', 'Search tasks by name or notes')
      .option('-a, --assignee <name>', 'Filter by Asana assignee name')
      .option('--agent <agentName>', 'Filter by agent assignment tag')
      .option('--due-from <date>', 'Filter tasks due from date (YYYY-MM-DD)')
      .option('--due-to <date>', 'Filter tasks due to/before date (YYYY-MM-DD)')
      .option('--tag <tags>', 'Filter by tag(s) - comma-separated')
      .option('-p, --priority <level>', 'Filter by priority (low, medium, high)')
      .action(async (filename, options) => {
        await this.exportJSON(filename, options);
      });

    exportCmd
      .command('markdown <filename>')
      .alias('md')
      .description(`Export tasks to Markdown format

Creates a human-readable Markdown document with task data organized by
sections and status. Great for documentation and reports.

Arguments:
  filename - Output file path (e.g., report.md)

Options:
  All filtering options from 'list' command are supported

Examples:
  dm export markdown sprint-report.md -i
  dm export md weekly-tasks.md --due-to 2025-12-31
  dm export markdown team-status.md --agent team`)
      .option('-c, --completed', 'Export only completed tasks')
      .option('-i, --incomplete', 'Export only incomplete tasks')
      .option('-s, --search <query>', 'Search tasks by name or notes')
      .option('-a, --assignee <name>', 'Filter by Asana assignee name')
      .option('--agent <agentName>', 'Filter by agent assignment tag')
      .option('--due-from <date>', 'Filter tasks due from date (YYYY-MM-DD)')
      .option('--due-to <date>', 'Filter tasks due to/before date (YYYY-MM-DD)')
      .option('--tag <tags>', 'Filter by tag(s) - comma-separated')
      .option('-p, --priority <level>', 'Filter by priority (low, medium, high)')
      .action(async (filename, options) => {
        await this.exportMarkdown(filename, options);
      });
  }

  /**
   * Converts command-line options to ExportFilters.
   *
   * Args:
   *   options: Filter options from command line.
   *
   * Returns:
   *   ExportFilters object for the backend.
   */
  private buildFilters(options: any): Backends.ExportFilters {
    const filters: Backends.ExportFilters = {};

    // Filter by completion status
    if (options.completed) {
      filters.completed = true;
    } else if (options.incomplete) {
      filters.completed = false;
    }

    // Filter by assignee
    if (options.assignee) {
      filters.assignee = options.assignee;
    }

    // Filter by tags
    if (options.tag) {
      filters.tags = options.tag.split(',').map((t: string) => t.trim());
    }

    // Add agent tag to filter tags
    if (options.agent) {
      const agentTag = `agent:${options.agent}`;
      if (filters.tags) {
        filters.tags.push(agentTag);
      } else {
        filters.tags = [agentTag];
      }
    }

    // Filter by due date range
    if (options.dueFrom) {
      filters.dueAfter = options.dueFrom;
    }
    if (options.dueTo) {
      filters.dueBefore = options.dueTo;
    }

    // Filter by priority
    if (options.priority) {
      const priorityLevel = options.priority.toLowerCase();
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(priorityLevel)) {
        console.error('✗ Invalid priority. Must be: low, medium, or high');
        process.exit(1);
      }
      filters.priority = priorityLevel as 'low' | 'medium' | 'high';
    }

    // Add search query as custom filter
    if (options.search) {
      const query = options.search.toLowerCase();
      filters.customFilter = (task: Backends.Task): boolean =>
        task.name.toLowerCase().includes(query) ||
        (task.notes ? task.notes.toLowerCase().includes(query) : false);
    }

    return filters;
  }

  /**
   * Exports tasks to CSV format.
   *
   * Args:
   *   filename: Output file path.
   *   options: Filter options.
   */
  private async exportCSV(filename: string, options: any): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getExportBackend();
      const filters = this.buildFilters(options);

      const count = await backend.exportToCSV(filename, filters);

      if (count === 0) {
        console.log('⚠ No tasks found matching criteria. No file created.');
        return;
      }

      console.log(`\n✓ Exported ${count} task(s) to ${filename}`);
      console.log(`  Format: CSV`);
      console.log();
    } catch (error) {
      console.error(`✗ Error exporting to CSV: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Exports tasks to JSON format.
   *
   * Args:
   *   filename: Output file path.
   *   options: Filter options.
   */
  private async exportJSON(filename: string, options: any): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getExportBackend();
      const filters = this.buildFilters(options);

      const count = await backend.exportToJSON(filename, filters);

      if (count === 0) {
        console.log('⚠ No tasks found matching criteria. No file created.');
        return;
      }

      console.log(`\n✓ Exported ${count} task(s) to ${filename}`);
      console.log(`  Format: JSON`);
      console.log();
    } catch (error) {
      console.error(`✗ Error exporting to JSON: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Exports tasks to Markdown format.
   *
   * Args:
   *   filename: Output file path.
   *   options: Filter options.
   */
  private async exportMarkdown(filename: string, options: any): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getExportBackend();
      const filters = this.buildFilters(options);

      const count = await backend.exportToMarkdown(filename, filters);

      if (count === 0) {
        console.log('⚠ No tasks found matching criteria. No file created.');
        return;
      }

      console.log(`\n✓ Exported ${count} task(s) to ${filename}`);
      console.log(`  Format: Markdown`);
      console.log();
    } catch (error) {
      console.error(`✗ Error exporting to Markdown: ${error}`);
      process.exit(1);
    }
  }
}
