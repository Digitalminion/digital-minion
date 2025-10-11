import * as path from 'path';
import * as fs from 'fs';
import { IExportBackend, ExportFilters } from '../core/export-backend';
import { Task } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the IExportBackend interface.
 *
 * Exports tasks to various formats (CSV, JSON, Markdown) with optional
 * filtering capabilities.
 */
export class LocalExportBackend extends LocalBackendBase implements IExportBackend {
  private taskBackend: LocalTaskBackend;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);
    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  async exportToCSV(filename: string, filters?: ExportFilters): Promise<number> {
    try {
      const tasks = await this.getFilteredTasks(filters);

      // Create CSV header
      const headers = [
        'ID',
        'Name',
        'Notes',
        'Completed',
        'Due Date',
        'Start Date',
        'Priority',
        'Assignee',
        'Tags',
        'Section',
        'Is Milestone',
        'Parent Task',
      ];

      // Create CSV rows
      const rows = tasks.map(task => {
        const section = task.memberships && task.memberships.length > 0
          ? task.memberships[0].section.name
          : '';

        return [
          task.gid,
          this.escapeCsvValue(task.name),
          this.escapeCsvValue(task.notes || ''),
          task.completed ? 'Yes' : 'No',
          task.dueOn || '',
          task.startOn || '',
          task.priority || '',
          task.assignee || '',
          this.escapeCsvValue((task.tags || []).join(', ')),
          this.escapeCsvValue(section),
          task.isMilestone ? 'Yes' : 'No',
          task.parent || '',
        ];
      });

      // Combine header and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      // Write to file
      fs.writeFileSync(filename, csvContent, 'utf8');

      return tasks.length;
    } catch (error) {
      throw new Error(`Failed to export to CSV: ${error}`);
    }
  }

  async exportToJSON(filename: string, filters?: ExportFilters): Promise<number> {
    try {
      const tasks = await this.getFilteredTasks(filters);

      // Write to file with pretty formatting
      fs.writeFileSync(filename, JSON.stringify(tasks, null, 2), 'utf8');

      return tasks.length;
    } catch (error) {
      throw new Error(`Failed to export to JSON: ${error}`);
    }
  }

  async exportToMarkdown(filename: string, filters?: ExportFilters): Promise<number> {
    try {
      const tasks = await this.getFilteredTasks(filters);

      // Group tasks by section
      const tasksBySection = this.groupTasksBySection(tasks);

      // Build markdown content
      const lines: string[] = [];
      lines.push('# Tasks Export');
      lines.push('');
      lines.push(`Exported on: ${new Date().toLocaleDateString()}`);
      lines.push('');

      for (const [section, sectionTasks] of Object.entries(tasksBySection)) {
        lines.push(`## ${section}`);
        lines.push('');

        for (const task of sectionTasks) {
          const checkbox = task.completed ? '[x]' : '[ ]';
          lines.push(`- ${checkbox} **${task.name}**`);

          if (task.notes) {
            lines.push(`  - ${task.notes}`);
          }

          const metadata: string[] = [];
          if (task.dueOn) metadata.push(`Due: ${task.dueOn}`);
          if (task.priority) metadata.push(`Priority: ${task.priority}`);
          if (task.assignee) metadata.push(`Assignee: ${task.assignee}`);
          if (task.tags && task.tags.length > 0) {
            metadata.push(`Tags: ${task.tags.join(', ')}`);
          }

          if (metadata.length > 0) {
            lines.push(`  - _${metadata.join(' | ')}_`);
          }

          lines.push('');
        }
      }

      // Write to file
      fs.writeFileSync(filename, lines.join('\n'), 'utf8');

      return tasks.length;
    } catch (error) {
      throw new Error(`Failed to export to Markdown: ${error}`);
    }
  }

  /**
   * Gets tasks and applies filters.
   */
  private async getFilteredTasks(filters?: ExportFilters): Promise<Task[]> {
    let tasks = await this.taskBackend.listTasks();

    if (!filters) {
      return tasks;
    }

    // Apply completion filter
    if (filters.completed !== undefined) {
      tasks = tasks.filter(t => t.completed === filters.completed);
    }

    // Apply assignee filter
    if (filters.assignee) {
      tasks = tasks.filter(t =>
        t.assignee?.toLowerCase().includes(filters.assignee!.toLowerCase())
      );
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      tasks = tasks.filter(t => {
        const taskTags = t.tags || [];
        return filters.tags!.some(filterTag =>
          taskTags.some(taskTag => taskTag.toLowerCase() === filterTag.toLowerCase())
        );
      });
    }

    // Apply section filter
    if (filters.section) {
      tasks = tasks.filter(t => {
        if (!t.memberships || t.memberships.length === 0) return false;
        return t.memberships.some(m =>
          m.section.name.toLowerCase().includes(filters.section!.toLowerCase())
        );
      });
    }

    // Apply due date filters
    if (filters.dueBefore) {
      tasks = tasks.filter(t => t.dueOn && t.dueOn <= filters.dueBefore!);
    }

    if (filters.dueAfter) {
      tasks = tasks.filter(t => t.dueOn && t.dueOn >= filters.dueAfter!);
    }

    // Apply priority filter
    if (filters.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }

    // Apply custom filter
    if (filters.customFilter) {
      tasks = tasks.filter(filters.customFilter);
    }

    return tasks;
  }

  /**
   * Groups tasks by their section.
   */
  private groupTasksBySection(tasks: Task[]): Record<string, Task[]> {
    const grouped: Record<string, Task[]> = {
      'No Section': [],
    };

    for (const task of tasks) {
      let section = 'No Section';

      if (task.memberships && task.memberships.length > 0) {
        section = task.memberships[0].section.name;
      }

      if (!grouped[section]) {
        grouped[section] = [];
      }

      grouped[section].push(task);
    }

    return grouped;
  }

  /**
   * Escapes a value for CSV format.
   */
  private escapeCsvValue(value: string): string {
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
