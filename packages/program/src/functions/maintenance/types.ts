/**
 * Maintenance function type - for recurring scheduled tasks.
 *
 * Mapping to Asana:
 * - MaintenanceSchedule → Asana Project
 * - Process → Asana Milestone
 * - MaintenanceTask → Asana Task (organized by time-based sections)
 * - MaintenanceStep → Asana Subtask
 */

import { WorkItem } from '../../core/types';

/**
 * Time-based sections for organizing maintenance tasks.
 * Based on due dates.
 */
export type TimeSection =
  | 'overdue'
  | 'due-now'
  | 'due-today'
  | 'due-tomorrow'
  | 'due-end-of-week'
  | 'due-end-of-month'
  | 'future';

/**
 * Recurrence pattern for maintenance tasks
 */
export type RecurrencePattern =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'annually';

/**
 * Process status
 */
export type ProcessStatus = 'active' | 'paused' | 'completed' | 'archived';

/**
 * MaintenanceSchedule represents a collection of recurring maintenance work.
 * Maps to Asana Project.
 */
export interface MaintenanceSchedule extends WorkItem {
  /** Processes within this maintenance schedule */
  processes: Process[];

  /** Time-based sections */
  sections: TimeSection[];
}

/**
 * Process represents a recurring maintenance workflow.
 * Maps to Asana Milestone.
 */
export interface Process {
  /** Unique identifier */
  id: string;

  /** Parent maintenance schedule ID */
  scheduleId: string;

  /** Process name */
  name: string;

  /** Optional description */
  description?: string;

  /** Process status */
  status: ProcessStatus;

  /** Recurrence pattern */
  recurrence: RecurrencePattern;

  /** Task template for generation */
  template: TaskTemplate;

  /** Last generation date */
  lastGenerated?: string;

  /** Next scheduled generation */
  nextScheduled?: string;

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * TaskTemplate defines the structure for generated maintenance tasks.
 */
export interface TaskTemplate {
  /** Template name */
  name: string;

  /** Template description */
  description?: string;

  /** Default assignee */
  defaultAssignee?: string;

  /** Estimated duration */
  estimatedDuration?: string;

  /** Step templates */
  steps?: StepTemplate[];

  /** Tags to apply */
  tags?: string[];
}

/**
 * StepTemplate for generating maintenance steps.
 */
export interface StepTemplate {
  /** Step name */
  name: string;

  /** Default assignee */
  defaultAssignee?: string;
}

/**
 * MaintenanceTask represents a generated instance of a maintenance process.
 * Maps to Asana Task.
 */
export interface MaintenanceTask {
  /** Unique identifier */
  id: string;

  /** Parent process ID */
  processId: string;

  /** Parent schedule ID */
  scheduleId: string;

  /** Task name */
  name: string;

  /** Optional description */
  description?: string;

  /** Completion status */
  completed: boolean;

  /** Due date */
  dueDate: string;

  /** Time section (calculated from due date) */
  timeSection: TimeSection;

  /** Optional assignee */
  assignee?: string;

  /** Tags */
  tags?: string[];

  /** Steps */
  steps: MaintenanceStep[];

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * MaintenanceStep represents a step within a maintenance task.
 * Maps to Asana Subtask.
 */
export interface MaintenanceStep {
  /** Unique identifier */
  id: string;

  /** Parent task ID */
  taskId: string;

  /** Step name */
  name: string;

  /** Completion status */
  completed: boolean;

  /** Optional assignee */
  assignee?: string;

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new maintenance schedule
 */
export interface CreateMaintenanceScheduleInput {
  name: string;
  description?: string;
}

/**
 * Input for creating a new process
 */
export interface CreateProcessInput {
  scheduleId: string;
  name: string;
  description?: string;
  recurrence: RecurrencePattern;
  template: TaskTemplate;
}

/**
 * Input for creating a new maintenance task
 */
export interface CreateMaintenanceTaskInput {
  processId: string;
  scheduleId: string;
  name: string;
  description?: string;
  dueDate: string;
  assignee?: string;
  tags?: string[];
}

/**
 * Input for creating a new maintenance step
 */
export interface CreateMaintenanceStepInput {
  taskId: string;
  name: string;
  assignee?: string;
}
