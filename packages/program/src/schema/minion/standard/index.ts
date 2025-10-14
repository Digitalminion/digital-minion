/**
 * Standard Schema Namespace
 *
 * Defines core types and interfaces used across all function types.
 * These are the fundamental building blocks that all work items share.
 */

import { EntityPath } from '../entity';

/**
 * FunctionType represents different categories of work.
 */
export type FunctionType = 'matter' | 'project' | 'maintenance' | 'framework';

/**
 * BackendType represents supported backend implementations.
 */
export type BackendType = 'asana' | 'local' | 'custom';

/**
 * ProgramContext carries the full organizational context for any operation.
 * Every work item and operation knows its place in the organizational hierarchy.
 */
export interface ProgramContext {
  /** Full path through organizational hierarchy */
  path: EntityPath;

  /** Current function type (matter/project/maintenance) */
  functionType: FunctionType;

  /** Backend type being used */
  backendType: BackendType;

  /** Backend project/container ID (if applicable) */
  projectId?: string;

  /** Additional context properties */
  properties?: Record<string, any>;
}

/**
 * WorkItem is the base interface for all work items in the system.
 * All function-specific types (Matter, Project, MaintenanceProcess, etc.) extend this.
 */
export interface WorkItem {
  /** Unique identifier */
  id: string;

  /** Work item name/title */
  name: string;

  /** Detailed description */
  description?: string;

  /** Current status (function-specific values) */
  status: string;

  /** Optional due date (ISO 8601 date string) */
  dueDate?: string;

  /** Optional start date (ISO 8601 date string) */
  startDate?: string;

  /** Optional assignee (user ID or name) */
  assignee?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Context this work belongs to */
  context: ProgramContext;

  /** Backend-specific ID for syncing */
  _backendId?: string;

  /** Backend type */
  _backendType?: BackendType;

  /** Metadata */
  metadata: WorkItemMetadata;
}

/**
 * WorkItemMetadata contains common metadata for all work items.
 */
export interface WorkItemMetadata {
  /** When the work item was created (ISO 8601) */
  createdAt: string;

  /** When the work item was last updated (ISO 8601) */
  updatedAt: string;

  /** Who created the work item */
  createdBy?: string;

  /** Who last updated the work item */
  updatedBy?: string;

  /** Version for optimistic locking */
  version?: number;

  /** Sync state for backend synchronization */
  syncState?: SyncState;

  /** Custom properties for extensibility */
  customProperties?: Record<string, any>;
}

/**
 * SyncState tracks synchronization status with backend.
 */
export interface SyncState {
  /** When last synced with backend */
  lastSyncedAt?: string;

  /** Hash of last synced state */
  lastSyncedHash?: string;

  /** Whether there are pending local changes */
  hasPendingChanges: boolean;

  /** Whether there are conflicts with backend */
  hasConflicts: boolean;

  /** Conflict details if any */
  conflicts?: SyncConflict[];
}

/**
 * SyncConflict represents a conflict between local and backend state.
 */
export interface SyncConflict {
  /** Field that has conflict */
  field: string;

  /** Local value */
  localValue: any;

  /** Backend value */
  backendValue: any;

  /** When the conflict was detected */
  detectedAt: string;
}

/**
 * Priority levels for work items.
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Common status types used across functions.
 */
export enum CommonStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  ACTIVE = 'active',
  IN_PROGRESS = 'in-progress',
  ON_HOLD = 'on-hold',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

/**
 * TimeEstimate represents estimated time for work.
 */
export interface TimeEstimate {
  /** Estimated duration in minutes */
  minutes: number;

  /** Confidence level (0-100) */
  confidence?: number;

  /** Who provided the estimate */
  estimatedBy?: string;

  /** When the estimate was made */
  estimatedAt?: string;
}

/**
 * TimeTracking represents actual time spent on work.
 */
export interface TimeTracking {
  /** Total minutes spent */
  totalMinutes: number;

  /** Time entries */
  entries: TimeEntry[];
}

/**
 * TimeEntry represents a single time tracking entry.
 */
export interface TimeEntry {
  /** Entry ID */
  id: string;

  /** Who logged the time */
  user: string;

  /** Minutes logged */
  minutes: number;

  /** When the work was done */
  date: string;

  /** Optional note about the work */
  note?: string;

  /** When this entry was created */
  createdAt: string;
}

/**
 * Attachment represents a file or link attached to a work item.
 */
export interface Attachment {
  /** Attachment ID */
  id: string;

  /** Attachment name */
  name: string;

  /** Attachment type */
  type: 'file' | 'link' | 'image' | 'document';

  /** File URL or link URL */
  url: string;

  /** File size in bytes (for files) */
  size?: number;

  /** MIME type (for files) */
  mimeType?: string;

  /** Who uploaded the attachment */
  uploadedBy?: string;

  /** When uploaded */
  uploadedAt: string;

  /** Backend attachment ID */
  _backendId?: string;
}

/**
 * Comment represents a comment on a work item.
 */
export interface Comment {
  /** Comment ID */
  id: string;

  /** Comment text (supports markdown) */
  text: string;

  /** Who wrote the comment */
  author: string;

  /** When the comment was created */
  createdAt: string;

  /** When the comment was last edited */
  editedAt?: string;

  /** Backend comment ID */
  _backendId?: string;
}

/**
 * Dependency represents a relationship between work items.
 */
export interface Dependency {
  /** Dependency type */
  type: 'blocks' | 'blocked-by' | 'relates-to' | 'duplicates' | 'child-of' | 'parent-of';

  /** Target work item ID */
  targetId: string;

  /** Optional description of the dependency */
  description?: string;

  /** When the dependency was created */
  createdAt: string;
}

/**
 * Link represents a relationship to an external resource.
 */
export interface Link {
  /** Link ID */
  id: string;

  /** Link type */
  type: 'documentation' | 'ticket' | 'pr' | 'commit' | 'wiki' | 'custom';

  /** Link URL */
  url: string;

  /** Link title/description */
  title?: string;

  /** When the link was added */
  addedAt: string;
}

/**
 * Notification configuration for work items.
 */
export interface NotificationConfig {
  /** Notify on status changes */
  onStatusChange: boolean;

  /** Notify on assignments */
  onAssignment: boolean;

  /** Notify on due date approaching */
  onDueDateApproaching: boolean;

  /** Notify on comments */
  onComment: boolean;

  /** Custom notification rules */
  customRules?: NotificationRule[];
}

/**
 * NotificationRule defines custom notification logic.
 */
export interface NotificationRule {
  /** Rule ID */
  id: string;

  /** Rule name */
  name: string;

  /** When to trigger */
  trigger: 'field-change' | 'time-based' | 'custom';

  /** Field to watch (for field-change) */
  field?: string;

  /** Condition to evaluate */
  condition?: string;

  /** Who to notify */
  recipients: string[];

  /** Whether the rule is active */
  active: boolean;
}

/**
 * Statistics aggregation for work items.
 */
export interface WorkItemStatistics {
  /** Total count */
  total: number;

  /** Completed count */
  completed: number;

  /** In progress count */
  inProgress: number;

  /** Blocked count */
  blocked: number;

  /** Overdue count */
  overdue: number;

  /** Completion percentage */
  completionPercentage: number;

  /** Average completion time (minutes) */
  averageCompletionTime?: number;
}

/**
 * Search filter for work items.
 */
export interface WorkItemFilter {
  /** Filter by status */
  status?: string[];

  /** Filter by assignee */
  assignee?: string[];

  /** Filter by tags */
  tags?: string[];

  /** Filter by due date range */
  dueDateFrom?: string;
  dueDateTo?: string;

  /** Filter by created date range */
  createdFrom?: string;
  createdTo?: string;

  /** Text search in name/description */
  search?: string;

  /** Filter by priority */
  priority?: Priority[];

  /** Include completed items */
  includeCompleted?: boolean;

  /** Sort field */
  sortBy?: 'name' | 'dueDate' | 'createdAt' | 'updatedAt' | 'priority' | 'status';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Pagination: page number */
  page?: number;

  /** Pagination: items per page */
  pageSize?: number;
}

/**
 * Paginated result set for work items.
 */
export interface PaginatedResult<T> {
  /** Items in this page */
  items: T[];

  /** Total number of items */
  total: number;

  /** Current page number */
  page: number;

  /** Items per page */
  pageSize: number;

  /** Total number of pages */
  totalPages: number;

  /** Whether there's a next page */
  hasNext: boolean;

  /** Whether there's a previous page */
  hasPrevious: boolean;
}
