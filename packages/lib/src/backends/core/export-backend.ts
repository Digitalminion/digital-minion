import { Task } from './types';

/**
 * Filter options for data export operations.
 */
export interface ExportFilters {
  /** Filter by completion status. */
  completed?: boolean;

  /** Filter by assignee name. */
  assignee?: string;

  /** Filter by tag names. */
  tags?: string[];

  /** Filter by section name. */
  section?: string;

  /** Filter by due date range. */
  dueBefore?: string;
  dueAfter?: string;

  /** Filter by priority. */
  priority?: 'low' | 'medium' | 'high';

  /** Custom filter function. */
  customFilter?: (task: Task) => boolean;
}

/**
 * Interface for export backend implementations.
 *
 * Handles exporting task data to various formats (CSV, JSON, Markdown)
 * with optional filtering capabilities.
 */
export interface IExportBackend {
  /**
   * Exports tasks to CSV format.
   *
   * Args:
   *   filename: Output filename (with .csv extension).
   *   filters: Optional filters to apply before export.
   *
   * Returns:
   *   Number of tasks exported.
   */
  exportToCSV(filename: string, filters?: ExportFilters): Promise<number>;

  /**
   * Exports tasks to JSON format.
   *
   * Args:
   *   filename: Output filename (with .json extension).
   *   filters: Optional filters to apply before export.
   *
   * Returns:
   *   Number of tasks exported.
   */
  exportToJSON(filename: string, filters?: ExportFilters): Promise<number>;

  /**
   * Exports tasks to Markdown format.
   *
   * Args:
   *   filename: Output filename (with .md extension).
   *   filters: Optional filters to apply before export.
   *
   * Returns:
   *   Number of tasks exported.
   */
  exportToMarkdown(filename: string, filters?: ExportFilters): Promise<number>;
}
