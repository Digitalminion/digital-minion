/**
 * Represents a time entry logged against a task.
 */
export interface TimeEntry {
  /** Global identifier for the time entry. */
  gid: string;

  /** Task GID this time entry is for. */
  taskGid: string;

  /** Duration in minutes. */
  durationMinutes: number;

  /** When the time was logged (ISO 8601 format). */
  createdAt: string;

  /** User who created the entry. */
  createdBy?: string;

  /** Optional notes/description of the work done. */
  notes?: string;
}

/**
 * Time tracking statistics for a task.
 */
export interface TaskTimeStats {
  /** Task GID. */
  taskGid: string;

  /** Task name. */
  taskName: string;

  /** Total time logged in minutes. */
  totalMinutes: number;

  /** Total time formatted as hours and minutes (e.g., "2h 30m"). */
  totalFormatted: string;

  /** Number of time entries. */
  entryCount: number;

  /** Individual time entries. */
  entries: TimeEntry[];
}

/**
 * Backend interface for time tracking operations.
 *
 * Provides methods for logging time against tasks, viewing time entries,
 * and generating time reports.
 */
export interface ITimeTrackingBackend {
  /**
   * Logs time against a task.
   *
   * Args:
   *   taskId: The task GID to log time for.
   *   durationMinutes: Duration in minutes.
   *   notes: Optional notes about the work done.
   *
   * Returns:
   *   The created TimeEntry object.
   */
  logTime(taskId: string, durationMinutes: number, notes?: string): Promise<TimeEntry>;

  /**
   * Lists all time entries for a task.
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of TimeEntry objects.
   */
  listTimeEntries(taskId: string): Promise<TimeEntry[]>;

  /**
   * Gets time tracking statistics for a task.
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   TaskTimeStats object with aggregated time data.
   */
  getTaskTimeStats(taskId: string): Promise<TaskTimeStats>;

  /**
   * Deletes a time entry.
   *
   * Args:
   *   timeEntryId: The time entry GID to delete.
   */
  deleteTimeEntry(timeEntryId: string): Promise<void>;

  /**
   * Gets time tracking statistics for multiple tasks.
   *
   * Args:
   *   taskIds: Array of task GIDs.
   *
   * Returns:
   *   Array of TaskTimeStats objects.
   */
  getMultipleTaskTimeStats(taskIds: string[]): Promise<TaskTimeStats[]>;

  /**
   * Logs time with a duration string (e.g., "2h", "30m", "1h30m").
   *
   * Args:
   *   taskId: The task GID to log time for.
   *   duration: Duration string (e.g., "2h", "30m", "1h30m", "90m").
   *   notes: Optional notes about the work done.
   *
   * Returns:
   *   The created TimeEntry object.
   */
  logTimeWithDuration(taskId: string, duration: string, notes?: string): Promise<TimeEntry>;
}
