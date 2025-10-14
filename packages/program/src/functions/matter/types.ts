/**
 * Matter function type - for incidents, requests, and discovered issues.
 *
 * Mapping to Asana (creative mapping):
 * - Matter → Asana Milestone (using milestone as container concept)
 * - MatterType → Asana Section
 * - Activity → Asana Task (with dependency linking to Matter milestone)
 * - DiscreteTask → Asana Subtask
 */

import { WorkItem } from '../../core/types';

/**
 * Matter types represent categories of matters.
 * These map to Asana Sections.
 */
export type MatterType =
  | 'incident'
  | 'request'
  | 'vulnerability'
  | 'compliance'
  | 'investigation'
  | string; // Allow custom types

/**
 * Matter status
 */
export type MatterStatus =
  | 'open'
  | 'investigating'
  | 'in-progress'
  | 'resolved'
  | 'closed';

/**
 * Activity status
 */
export type ActivityStatus = 'pending' | 'in-progress' | 'complete';

/**
 * SLA (Service Level Agreement) defines time-based constraints.
 */
export interface SLA {
  /** Response time in hours */
  responseTime?: number;

  /** Resolution time in hours */
  resolutionTime?: number;

  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Matter represents issues that need to be solved.
 * Maps to Asana Milestone (conceptually) with supporting metadata.
 */
export interface Matter extends WorkItem {
  /** Matter type (maps to section) */
  type: MatterType;

  /** Matter status */
  status: MatterStatus;

  /** Who requested or reported this */
  requestedBy?: string;

  /** When it was discovered */
  discoveredDate: string;

  /** SLA constraints */
  sla?: SLA;

  /** Activities within this matter */
  activities: Activity[];

  /** Progress metrics */
  progress?: {
    totalActivities: number;
    completedActivities: number;
    totalTasks: number;
    completedTasks: number;
  };
}

/**
 * Activity represents work performed to resolve a matter.
 * Maps to Asana Task (linked to matter via dependency).
 */
export interface Activity {
  /** Unique identifier */
  id: string;

  /** Parent matter ID */
  matterId: string;

  /** Activity name */
  name: string;

  /** Optional description */
  description?: string;

  /** Activity status */
  status: ActivityStatus;

  /** Optional due date (may be SLA-driven) */
  dueDate?: string;

  /** Optional assignee */
  assignee?: string;

  /** Tags */
  tags?: string[];

  /** Discrete tasks within this activity */
  tasks: DiscreteTask[];

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * DiscreteTask represents a specific task within an activity.
 * Maps to Asana Subtask.
 */
export interface DiscreteTask {
  /** Unique identifier */
  id: string;

  /** Parent activity ID */
  activityId: string;

  /** Task name */
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
 * Input for creating a new matter
 */
export interface CreateMatterInput {
  name: string;
  type: MatterType;
  description?: string;
  requestedBy?: string;
  dueDate?: string;
  sla?: SLA;
  tags?: string[];
}

/**
 * Input for creating a new activity
 */
export interface CreateActivityInput {
  matterId: string;
  name: string;
  description?: string;
  dueDate?: string;
  assignee?: string;
  tags?: string[];
}

/**
 * Input for creating a new discrete task
 */
export interface CreateDiscreteTaskInput {
  activityId: string;
  name: string;
  assignee?: string;
}
