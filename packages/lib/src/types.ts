/**
 * Core types and interfaces for Digital Minion task management
 */

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Task status
 */
export enum TaskStatus {
  INCOMPLETE = 'incomplete',
  COMPLETE = 'complete'
}

/**
 * Basic task information
 */
export interface Task {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  due_on?: string;
  assignee?: string;
  tags?: string[];
  section?: string;
  priority?: TaskPriority;
  is_milestone?: boolean;
}

/**
 * Filter options for querying tasks
 */
export interface TaskFilter {
  agent?: string;
  incomplete?: boolean;
  complete?: boolean;
  tag?: string;
  search?: string;
  priority?: TaskPriority;
  dueFrom?: string;
  dueTo?: string;
  section?: string;
}
