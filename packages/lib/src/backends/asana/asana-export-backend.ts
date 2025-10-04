const Asana = require('asana');
import * as fs from 'fs';
import { IExportBackend, ExportFilters } from '../core/export-backend';
import { Task } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the IExportBackend interface.
 *
 * Provides task export functionality using the Asana API as the backend
 * data source. Handles exporting tasks to CSV, JSON, and Markdown formats
 * with optional filtering capabilities.
 *
 * This class focuses exclusively on export operations as defined by
 * the IExportBackend interface.
 */
export class AsanaExportBackend extends AsanaBackendBase implements IExportBackend {
  private tasksApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tasksApi = new Asana.TasksApi();
  }

  async exportToCSV(filename: string, filters?: ExportFilters): Promise<number> {
    try {
      const tasks = await this.listTasks();
      const filtered = this.applyFilters(tasks, filters);

      if (filtered.length === 0) {
        return 0;
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
        task.numSubtasks?.toString() || '0'
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Write to file
      fs.writeFileSync(filename, csv, 'utf-8');

      return filtered.length;
    } catch (error) {
      throw new Error(`Failed to export to CSV: ${error}`);
    }
  }

  async exportToJSON(filename: string, filters?: ExportFilters): Promise<number> {
    try {
      const tasks = await this.listTasks();
      const filtered = this.applyFilters(tasks, filters);

      if (filtered.length === 0) {
        return 0;
      }

      const data = {
        exportDate: new Date().toISOString(),
        taskCount: filtered.length,
        tasks: filtered
      };

      fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');

      return filtered.length;
    } catch (error) {
      throw new Error(`Failed to export to JSON: ${error}`);
    }
  }

  async exportToMarkdown(filename: string, filters?: ExportFilters): Promise<number> {
    try {
      const tasks = await this.listTasks();
      const filtered = this.applyFilters(tasks, filters);

      if (filtered.length === 0) {
        return 0;
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

      return filtered.length;
    } catch (error) {
      throw new Error(`Failed to export to Markdown: ${error}`);
    }
  }

  /**
   * Fetches all tasks from the configured Asana project.
   *
   * Returns:
   *   Array of Task objects.
   */
  private async listTasks(): Promise<Task[]> {
    try {
      const result = await this.tasksApi.getTasksForProject(this.projectId, {
        opt_fields: 'gid,name,notes,completed,due_on,start_on,assignee.name,assignee.gid,tags.name,parent.gid,num_subtasks,memberships.section.name,memberships.section.gid',
      });

      return result.data.map((task: any) => {
        const tags = task.tags?.map((tag: any) => tag.name) || [];
        // Derive priority from priority:* tags
        const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
        const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

        return {
          gid: task.gid,
          name: task.name,
          notes: task.notes || undefined,
          completed: task.completed,
          dueOn: task.due_on || undefined,
          startOn: task.start_on || undefined,
          assignee: task.assignee?.name || undefined,
          assigneeGid: task.assignee?.gid || undefined,
          tags,
          parent: task.parent?.gid || undefined,
          numSubtasks: task.num_subtasks || undefined,
          memberships: task.memberships || undefined,
          priority,
        };
      });
    } catch (error) {
      throw new Error(`Failed to list tasks: ${error}`);
    }
  }

  /**
   * Applies filter options to task list.
   *
   * Args:
   *   tasks: Array of tasks to filter.
   *   filters: Optional filter options.
   *
   * Returns:
   *   Filtered array of tasks.
   */
  private applyFilters(tasks: Task[], filters?: ExportFilters): Task[] {
    if (!filters) {
      return tasks;
    }

    let filtered = tasks;

    // Filter by completion status
    if (filters.completed !== undefined) {
      filtered = filtered.filter(t => t.completed === filters.completed);
    }

    // Filter by assignee
    if (filters.assignee) {
      const assigneeQuery = filters.assignee.toLowerCase();
      filtered = filtered.filter(t =>
        t.assignee && t.assignee.toLowerCase().includes(assigneeQuery)
      );
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const filterTags = filters.tags.map(t => t.toLowerCase());
      filtered = filtered.filter(t =>
        t.tags && t.tags.some((tag: string) =>
          filterTags.some((filterTag: string) => tag.toLowerCase().includes(filterTag))
        )
      );
    }

    // Filter by section
    if (filters.section) {
      const sectionQuery = filters.section.toLowerCase();
      filtered = filtered.filter(t =>
        t.memberships && t.memberships.some(m =>
          m.section.name.toLowerCase().includes(sectionQuery)
        )
      );
    }

    // Filter by due date range
    if (filters.dueAfter) {
      filtered = filtered.filter(t => t.dueOn && t.dueOn >= filters.dueAfter!);
    }
    if (filters.dueBefore) {
      filtered = filtered.filter(t => t.dueOn && t.dueOn <= filters.dueBefore!);
    }

    // Filter by priority
    if (filters.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    // Apply custom filter function
    if (filters.customFilter) {
      filtered = filtered.filter(filters.customFilter);
    }

    return filtered;
  }

  /**
   * Escapes a value for CSV format.
   *
   * Args:
   *   value: String to escape.
   *
   * Returns:
   *   Escaped and quoted string if necessary.
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
