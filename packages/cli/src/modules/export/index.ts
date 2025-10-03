import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { TaskBackend } from '../list/types';
import { AsanaTaskBackend } from '../list/asana-backend';
import { OutputFormatter } from '../../output';

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

  register(program: Command): void {
    const exportCmd = program
      .command('export')
      .description(`Export tasks to various formats

Export task data to CSV, JSON, or Markdown formats for reporting, backup,
or integration with other tools. Supports filtering by the same criteria
as the list command.

Supported formats:
  - CSV:      Spreadsheet-compatible format for Excel, Google Sheets
  - JSON:     Machine-readable format for programmatic processing
  - Markdown: Human-readable format for documentation

Examples:
  dm export csv tasks.csv -i
  dm export json backup.json
  dm export markdown report.md --agent becky -i
  dm export csv high-priority.csv --priority high -i`);

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
   * Gets the configured task backend.
   *
   * Returns:
   *   TaskBackend implementation (currently Asana only).
   */
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

  /**
   * Applies filter options to task list.
   *
   * Args:
   *   tasks: Array of tasks to filter.
   *   options: Filter options from command line.
   *
   * Returns:
   *   Filtered array of tasks.
   */
  private applyFilters(tasks: any[], options: any): any[] {
    let filtered = tasks;

    // Filter by completion status
    if (options.completed) {
      filtered = filtered.filter(t => t.completed);
    } else if (options.incomplete) {
      filtered = filtered.filter(t => !t.completed);
    }

    // Search by name/notes
    if (options.search) {
      const query = options.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        (t.notes && t.notes.toLowerCase().includes(query))
      );
    }

    // Filter by assignee
    if (options.assignee) {
      const assigneeQuery = options.assignee.toLowerCase();
      filtered = filtered.filter(t =>
        t.assignee && t.assignee.toLowerCase().includes(assigneeQuery)
      );
    }

    // Filter by agent
    if (options.agent) {
      const agentTag = `agent:${options.agent.toLowerCase()}`;
      filtered = filtered.filter(t =>
        t.tags && t.tags.some((tag: string) => tag.toLowerCase() === agentTag)
      );
    }

    // Filter by due date range
    if (options.dueFrom) {
      filtered = filtered.filter(t => t.dueOn && t.dueOn >= options.dueFrom);
    }
    if (options.dueTo) {
      filtered = filtered.filter(t => t.dueOn && t.dueOn <= options.dueTo);
    }

    // Filter by tags
    if (options.tag) {
      const filterTags = options.tag.split(',').map((t: string) => t.trim().toLowerCase());
      filtered = filtered.filter(t =>
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
        console.error('✗ Invalid priority. Must be: low, medium, or high');
        process.exit(1);
      }
      filtered = filtered.filter(t => t.priority === priorityLevel);
    }

    return filtered;
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
      const backend = this.getBackend();
      const tasks = await backend.listTasks();
      const filtered = this.applyFilters(tasks, options);

      if (filtered.length === 0) {
        console.log('⚠ No tasks found matching criteria. No file created.');
        return;
      }

      // Build CSV content
      const headers = ['ID', 'Name', 'Status', 'Priority', 'Due Date', 'Assignee', 'Tags', 'Notes', 'Subtasks'];
      const rows = filtered.map(task => [
        task.gid,
        this.escapeCsv(task.name),
        task.completed ? 'Completed' : 'Incomplete',
        task.priority || '',
        task.dueOn || '',
        task.assignee || '',
        task.tags ? this.escapeCsv(task.tags.join('; ')) : '',
        task.notes ? this.escapeCsv(task.notes) : '',
        task.numSubtasks || '0'
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Write to file
      fs.writeFileSync(filename, csv, 'utf-8');

      console.log(`\n✓ Exported ${filtered.length} task(s) to ${filename}`);
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
      const backend = this.getBackend();
      const tasks = await backend.listTasks();
      const filtered = this.applyFilters(tasks, options);

      if (filtered.length === 0) {
        console.log('⚠ No tasks found matching criteria. No file created.');
        return;
      }

      const data = {
        exportDate: new Date().toISOString(),
        taskCount: filtered.length,
        tasks: filtered
      };

      fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');

      console.log(`\n✓ Exported ${filtered.length} task(s) to ${filename}`);
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
      const backend = this.getBackend();
      const tasks = await backend.listTasks();
      const filtered = this.applyFilters(tasks, options);

      if (filtered.length === 0) {
        console.log('⚠ No tasks found matching criteria. No file created.');
        return;
      }

      // Build Markdown content
      const lines: string[] = [];
      lines.push('# Task Export Report');
      lines.push('');
      lines.push(`**Export Date:** ${new Date().toLocaleString()}`);
      lines.push(`**Total Tasks:** ${filtered.length}`);
      lines.push('');

      // Group by status
      const incomplete = filtered.filter(t => !t.completed);
      const completed = filtered.filter(t => t.completed);

      if (incomplete.length > 0) {
        lines.push('## Incomplete Tasks');
        lines.push('');
        incomplete.forEach(task => {
          const priority = task.priority ? ` [${task.priority.toUpperCase()}]` : '';
          const due = task.dueOn ? ` (Due: ${task.dueOn})` : '';
          const assignee = task.assignee ? ` [@${task.assignee}]` : '';

          lines.push(`### ${task.name}${priority}${due}${assignee}`);
          lines.push('');
          lines.push(`**ID:** ${task.gid}`);
          if (task.notes) {
            lines.push(`**Notes:** ${task.notes}`);
          }
          if (task.tags && task.tags.length > 0) {
            lines.push(`**Tags:** ${task.tags.join(', ')}`);
          }
          if (task.numSubtasks && task.numSubtasks > 0) {
            lines.push(`**Subtasks:** ${task.numSubtasks}`);
          }
          lines.push('');
        });
      }

      if (completed.length > 0) {
        lines.push('## Completed Tasks');
        lines.push('');
        completed.forEach(task => {
          const priority = task.priority ? ` [${task.priority.toUpperCase()}]` : '';
          const assignee = task.assignee ? ` [@${task.assignee}]` : '';

          lines.push(`### ✓ ${task.name}${priority}${assignee}`);
          lines.push('');
          lines.push(`**ID:** ${task.gid}`);
          if (task.notes) {
            lines.push(`**Notes:** ${task.notes}`);
          }
          if (task.tags && task.tags.length > 0) {
            lines.push(`**Tags:** ${task.tags.join(', ')}`);
          }
          lines.push('');
        });
      }

      fs.writeFileSync(filename, lines.join('\n'), 'utf-8');

      console.log(`\n✓ Exported ${filtered.length} task(s) to ${filename}`);
      console.log(`  Format: Markdown`);
      console.log(`  Incomplete: ${incomplete.length}, Completed: ${completed.length}`);
      console.log();
    } catch (error) {
      console.error(`✗ Error exporting to Markdown: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Escapes a value for CSV format.
   *
   * Args:
   *   value: String to escape.
   *
   * Returns:
   *   Escaped and quoted string.
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
