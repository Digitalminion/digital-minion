/**
 * Maintenance Function Schema
 *
 * Defines types for recurring scheduled tasks and automated task generation.
 *
 * Backend Mapping:
 * - MaintenanceProcess → Backend Milestone
 * - MaintenanceTask → Backend Task (organized by due date sections)
 * - Step → Backend Subtask
 */

import { WorkItem, Priority, TimeEstimate, Comment, Attachment } from '../standard';

/**
 * MaintenanceFrequency defines how often tasks should be generated.
 */
export enum MaintenanceFrequency {
  /** Every day */
  DAILY = 'daily',

  /** Every week */
  WEEKLY = 'weekly',

  /** Every two weeks */
  BIWEEKLY = 'biweekly',

  /** Every month */
  MONTHLY = 'monthly',

  /** Every quarter (3 months) */
  QUARTERLY = 'quarterly',

  /** Every 6 months */
  SEMIANNUALLY = 'semiannually',

  /** Every year */
  ANNUALLY = 'annually',

  /** Custom recurrence pattern */
  CUSTOM = 'custom'
}

/**
 * MaintenanceProcessStatus represents the state of a maintenance process.
 */
export enum MaintenanceProcessStatus {
  /** Process is active and generating tasks */
  ACTIVE = 'active',

  /** Process is paused, no new tasks generated */
  PAUSED = 'paused',

  /** Process is archived (historical) */
  ARCHIVED = 'archived'
}

/**
 * MaintenanceTaskStatus tracks task lifecycle.
 */
export enum MaintenanceTaskStatus {
  /** Task is pending, not yet due */
  PENDING = 'pending',

  /** Task is due and should be worked */
  DUE = 'due',

  /** Task is overdue */
  OVERDUE = 'overdue',

  /** Task is in progress */
  IN_PROGRESS = 'in-progress',

  /** Task is completed */
  COMPLETED = 'completed',

  /** Task was skipped */
  SKIPPED = 'skipped'
}

/**
 * DayOfWeek for weekly recurrence patterns.
 */
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6
}

/**
 * RecurrencePattern defines complex recurrence rules.
 */
export interface RecurrencePattern {
  /** Base frequency */
  frequency: MaintenanceFrequency;

  /** Interval (e.g., every 2 weeks) */
  interval?: number;

  /** For weekly: which days of week */
  daysOfWeek?: DayOfWeek[];

  /** For monthly: which day of month (1-31) */
  dayOfMonth?: number;

  /** For monthly: which occurrence (e.g., "first Monday") */
  occurrence?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  weekday?: DayOfWeek;

  /** For yearly: which month (1-12) */
  monthOfYear?: number;

  /** Start date for recurrence */
  startDate: string;

  /** Optional end date */
  endDate?: string;

  /** Maximum number of occurrences */
  maxOccurrences?: number;

  /** Timezone for scheduling */
  timezone?: string;
}

/**
 * StepTemplate defines a template for a maintenance task step.
 */
export interface StepTemplate {
  /** Step name */
  name: string;

  /** Step description/instructions */
  description?: string;

  /** Default assignee */
  defaultAssignee?: string;

  /** Estimated time */
  estimatedMinutes?: number;

  /** Whether this step is required */
  required: boolean;

  /** Order/sequence number */
  order: number;

  /** Checklist items for this step */
  checklist?: string[];
}

/**
 * MaintenanceTaskTemplate defines how to generate tasks.
 */
export interface MaintenanceTaskTemplate {
  /** Task name template (can include variables like {date}) */
  nameTemplate: string;

  /** Task description template */
  descriptionTemplate?: string;

  /** Default assignee */
  defaultAssignee?: string;

  /** Priority for generated tasks */
  defaultPriority: Priority;

  /** Steps for each generated task */
  steps: StepTemplate[];

  /** Tags to apply */
  tags?: string[];

  /** Time estimate */
  estimatedMinutes?: number;

  /** How many days before due date to generate task */
  generateDaysBefore: number;
}

/**
 * MaintenanceProcess represents a recurring maintenance process.
 */
export interface MaintenanceProcess extends WorkItem {
  /** Process status */
  status: MaintenanceProcessStatus;

  /** Recurrence pattern */
  recurrence: RecurrencePattern;

  /** Task template */
  taskTemplate: MaintenanceTaskTemplate;

  /** Process owner/responsible person */
  owner?: string;

  /** When the next task should be generated */
  nextGenerationDate: string;

  /** When the next task is due */
  nextDueDate: string;

  /** History of generated tasks */
  generatedTasks: string[];

  /** Statistics */
  statistics: MaintenanceStatistics;

  /** SOP or runbook link */
  runbookUrl?: string;

  /** Category for organizing processes */
  category?: string;

  /** Comments */
  comments?: Comment[];

  /** Attachments (SOPs, documentation) */
  attachments?: Attachment[];
}

/**
 * MaintenanceStatistics tracks process execution metrics.
 */
export interface MaintenanceStatistics {
  /** Total tasks generated */
  totalGenerated: number;

  /** Total completed */
  totalCompleted: number;

  /** Total skipped */
  totalSkipped: number;

  /** Completion rate percentage */
  completionRate: number;

  /** Average completion time (minutes) */
  averageCompletionTime?: number;

  /** On-time completion rate */
  onTimeRate: number;

  /** Last execution date */
  lastExecutedAt?: string;

  /** Last completion date */
  lastCompletedAt?: string;
}

/**
 * MaintenanceTask represents a generated instance of maintenance work.
 */
export interface MaintenanceTask {
  /** Task ID */
  id: string;

  /** Parent process ID */
  processId: string;

  /** Task name */
  name: string;

  /** Task description */
  description?: string;

  /** Task status */
  status: MaintenanceTaskStatus;

  /** Priority */
  priority: Priority;

  /** Due date */
  dueDate: string;

  /** When task was generated */
  generatedAt: string;

  /** When task was started */
  startedAt?: string;

  /** When task was completed */
  completedAt?: string;

  /** Assignee */
  assignee?: string;

  /** Steps to complete */
  steps: MaintenanceStep[];

  /** Notes or findings from execution */
  executionNotes?: string;

  /** Issues encountered */
  issues?: string[];

  /** Tags */
  tags?: string[];

  /** Time section (for organizing by due date) */
  timeSection: TimeSection;

  /** Comments */
  comments?: Comment[];

  /** Attachments */
  attachments?: Attachment[];

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * TimeSection for organizing tasks by due date.
 */
export enum TimeSection {
  /** Past due date */
  OVERDUE = 'overdue',

  /** Due today */
  DUE_TODAY = 'due-today',

  /** Due tomorrow */
  DUE_TOMORROW = 'due-tomorrow',

  /** Due this week */
  DUE_THIS_WEEK = 'due-this-week',

  /** Due next week */
  DUE_NEXT_WEEK = 'due-next-week',

  /** Due later */
  DUE_LATER = 'due-later'
}

/**
 * MaintenanceStep represents a step within a maintenance task.
 */
export interface MaintenanceStep {
  /** Step ID */
  id: string;

  /** Parent task ID */
  taskId: string;

  /** Step name */
  name: string;

  /** Step description/instructions */
  description?: string;

  /** Completion status */
  completed: boolean;

  /** Assignee */
  assignee?: string;

  /** Order/sequence */
  order: number;

  /** Required step? */
  required: boolean;

  /** Checklist items */
  checklist?: ChecklistItem[];

  /** Notes from execution */
  notes?: string;

  /** When completed */
  completedAt?: string;

  /** Who completed */
  completedBy?: string;

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * ChecklistItem for steps.
 */
export interface ChecklistItem {
  /** Item ID */
  id: string;

  /** Item text */
  text: string;

  /** Completion status */
  checked: boolean;

  /** When checked */
  checkedAt?: string;

  /** Who checked */
  checkedBy?: string;
}

/**
 * Input for creating a maintenance process
 */
export interface CreateMaintenanceProcessInput {
  name: string;
  description?: string;
  frequency: MaintenanceFrequency;
  recurrence: Partial<RecurrencePattern>;
  taskTemplate: MaintenanceTaskTemplate;
  owner?: string;
  category?: string;
  runbookUrl?: string;
  tags?: string[];
}

/**
 * Input for generating tasks from a process
 */
export interface GenerateMaintenanceTasksInput {
  /** Process ID */
  processId?: string;

  /** Generate for all processes? */
  allProcesses?: boolean;

  /** How far ahead to generate (days) */
  lookAheadDays?: number;

  /** Dry run - don't actually create tasks */
  dryRun?: boolean;
}

/**
 * Result of task generation
 */
export interface GenerateMaintenanceTasksResult {
  /** Number of processes evaluated */
  processesEvaluated: number;

  /** Number of tasks generated */
  tasksGenerated: number;

  /** Generated task IDs */
  generatedTaskIds: string[];

  /** Any errors encountered */
  errors?: string[];
}

/**
 * Input for updating maintenance task status
 */
export interface UpdateMaintenanceTaskStatusInput {
  taskId: string;
  status: MaintenanceTaskStatus;
  executionNotes?: string;
  issues?: string[];
}

/**
 * Input for completing a step
 */
export interface CompleteStepInput {
  stepId: string;
  notes?: string;
  checklistUpdates?: Record<string, boolean>;
}

/**
 * Maintenance schedule view
 */
export interface MaintenanceSchedule {
  /** Date range */
  startDate: string;
  endDate: string;

  /** Tasks by date */
  tasksByDate: Record<string, MaintenanceTask[]>;

  /** Tasks by section */
  tasksBySection: Record<TimeSection, MaintenanceTask[]>;

  /** Summary statistics */
  summary: {
    totalTasks: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    completed: number;
    pending: number;
  };
}

/**
 * Maintenance compliance report
 */
export interface MaintenanceComplianceReport {
  /** Reporting period */
  period: {
    start: string;
    end: string;
  };

  /** Overall compliance percentage */
  overallCompliance: number;

  /** Compliance by process */
  byProcess: ProcessCompliance[];

  /** Compliance by category */
  byCategory: Record<string, number>;

  /** Missed tasks */
  missedTasks: MaintenanceTask[];

  /** Late completions */
  lateCompletions: MaintenanceTask[];

  /** Recommendations */
  recommendations: string[];
}

/**
 * Compliance metrics for a single process
 */
export interface ProcessCompliance {
  /** Process info */
  process: {
    id: string;
    name: string;
    frequency: MaintenanceFrequency;
  };

  /** Compliance percentage */
  complianceRate: number;

  /** Tasks due */
  tasksDue: number;

  /** Tasks completed */
  tasksCompleted: number;

  /** Tasks completed on time */
  tasksOnTime: number;

  /** Tasks missed/skipped */
  tasksMissed: number;

  /** Average days late (for late completions) */
  averageDaysLate?: number;
}

/**
 * Maintenance process filter
 */
export interface MaintenanceProcessFilter {
  /** Filter by status */
  status?: MaintenanceProcessStatus[];

  /** Filter by frequency */
  frequency?: MaintenanceFrequency[];

  /** Filter by category */
  category?: string[];

  /** Filter by owner */
  owner?: string[];

  /** Text search */
  search?: string;

  /** Include archived */
  includeArchived?: boolean;
}

/**
 * Maintenance task filter
 */
export interface MaintenanceTaskFilter {
  /** Filter by status */
  status?: MaintenanceTaskStatus[];

  /** Filter by time section */
  timeSection?: TimeSection[];

  /** Filter by process */
  processId?: string[];

  /** Filter by assignee */
  assignee?: string[];

  /** Filter by due date range */
  dueDateFrom?: string;
  dueDateTo?: string;

  /** Include completed */
  includeCompleted?: boolean;
}
