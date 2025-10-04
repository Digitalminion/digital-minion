import { Task } from './types';

/**
 * Filter options for listing tasks.
 */
export interface ListFilters {
  /** Filter by completion status. */
  completed?: boolean;

  /** Filter by assignee name. */
  assignee?: string;

  /** Filter by agent name (from tags). */
  agent?: string;

  /** Filter by tag names. */
  tags?: string[];

  /** Filter by section name. */
  section?: string;

  /** Filter by due date range. */
  dueBefore?: string;
  dueAfter?: string;

  /** Filter by priority. */
  priority?: 'low' | 'medium' | 'high';

  /** Search query to match against task name/notes. */
  query?: string;

  /** Custom filter function. */
  customFilter?: (task: Task) => boolean;
}

/**
 * Interface for list/search backend implementations.
 *
 * Provides advanced task querying, filtering, and agent assignment
 * management through tag-based conventions.
 */
export interface IListBackend {
  /**
   * Lists tasks with optional filtering.
   *
   * Args:
   *   filters: Optional filters to apply.
   *
   * Returns:
   *   Array of Task objects matching the filters.
   */
  listTasks(filters?: ListFilters): Promise<Task[]>;

  /**
   * Searches tasks using a query string and optional filters.
   *
   * Args:
   *   query: Search query to match against task name/notes.
   *   filters: Optional additional filters.
   *
   * Returns:
   *   Array of Task objects matching the search.
   */
  searchTasks(query: string, filters?: ListFilters): Promise<Task[]>;

  /**
   * Assigns an agent to a task using the agent: tag convention.
   *
   * Args:
   *   taskId: The task GID to assign.
   *   agentName: The agent name to assign.
   *
   * Returns:
   *   The updated Task object.
   */
  assignAgent(taskId: string, agentName: string): Promise<Task>;

  /**
   * Unassigns the current agent from a task by removing agent: tag.
   *
   * Args:
   *   taskId: The task GID to unassign.
   *
   * Returns:
   *   The updated Task object.
   */
  unassignAgent(taskId: string): Promise<Task>;

  /**
   * Reassigns a task from one agent to another.
   *
   * Args:
   *   taskId: The task GID to reassign.
   *   newAgentName: The new agent name to assign.
   *
   * Returns:
   *   The updated Task object.
   */
  reassignAgent(taskId: string, newAgentName: string): Promise<Task>;
}
