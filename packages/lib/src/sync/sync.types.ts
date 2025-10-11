import { Task } from '../backends/core/types';
import { AllBackends } from '../backends/factory';

/**
 * Represents a backend endpoint for sync operations.
 */
export interface SyncBackend {
  /** Unique identifier for this backend instance */
  id: string;

  /** Display name for this backend */
  name: string;

  /** Backend type */
  type: 'local' | 'asana' | string;

  /** The actual backend instances */
  backends: AllBackends;
}

/**
 * Sync direction modes.
 */
export enum SyncDirection {
  /** One-way: Source → Target */
  ONE_WAY = 'one-way',

  /** Two-way: Source ↔ Target */
  TWO_WAY = 'two-way',

  /** N-way: Multiple backends sync with each other */
  N_WAY = 'n-way',
}

/**
 * Conflict resolution strategies.
 */
export enum ConflictStrategy {
  /** Source always wins */
  SOURCE_WINS = 'source-wins',

  /** Target always wins */
  TARGET_WINS = 'target-wins',

  /** Most recently modified wins */
  LAST_WRITE_WINS = 'last-write-wins',

  /** First write wins (never overwrite) */
  FIRST_WRITE_WINS = 'first-write-wins',

  /** Manual resolution required */
  MANUAL = 'manual',

  /** Merge changes when possible */
  MERGE = 'merge',
}

/**
 * Tracks the sync state for an item across backends.
 */
export interface SyncItemState {
  /** Local identifier for the sync item */
  syncId: string;

  /** Map of backend ID to item ID in that backend */
  backendIds: Record<string, string>;

  /** Last sync timestamp per backend */
  lastSyncTimes: Record<string, string>;

  /** Hash or version of the item per backend */
  versions: Record<string, string>;

  /** When this sync item was created */
  createdAt: string;

  /** When this sync item was last updated */
  updatedAt: string;

  /** Whether this item has conflicts */
  hasConflicts?: boolean;

  /** Conflict details if any */
  conflicts?: SyncConflict[];
}

/**
 * Represents a sync conflict between backends.
 */
export interface SyncConflict {
  /** Which field has the conflict */
  field: string;

  /** Backend ID and value pairs */
  values: Record<string, any>;

  /** When the conflict was detected */
  detectedAt: string;

  /** Resolution strategy to use */
  strategy: ConflictStrategy;

  /** Whether the conflict has been resolved */
  resolved: boolean;

  /** Resolution details if resolved */
  resolution?: {
    chosenValue: any;
    chosenBackend: string;
    resolvedAt: string;
  };
}

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;

  /** Sync direction used */
  direction: SyncDirection;

  /** Backends involved */
  backends: string[];

  /** Statistics */
  stats: SyncStats;

  /** Conflicts encountered */
  conflicts: SyncConflict[];

  /** Errors encountered */
  errors: SyncError[];

  /** When sync started */
  startedAt: string;

  /** When sync completed */
  completedAt: string;

  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Sync statistics.
 */
export interface SyncStats {
  /** Items checked for changes */
  itemsChecked: number;

  /** Items created */
  itemsCreated: number;

  /** Items updated */
  itemsUpdated: number;

  /** Items deleted */
  itemsDeleted: number;

  /** Items skipped */
  itemsSkipped: number;

  /** Conflicts detected */
  conflictsDetected: number;

  /** Conflicts resolved */
  conflictsResolved: number;
}

/**
 * Sync error details.
 */
export interface SyncError {
  /** Error type */
  type: 'network' | 'validation' | 'conflict' | 'backend' | 'unknown';

  /** Error message */
  message: string;

  /** Backend where error occurred */
  backend?: string;

  /** Item ID if error is item-specific */
  itemId?: string;

  /** Stack trace if available */
  stack?: string;

  /** When error occurred */
  occurredAt: string;
}

/**
 * Configuration for a sync operation.
 */
export interface SyncConfig {
  /** Sync direction */
  direction: SyncDirection;

  /** Conflict resolution strategy */
  conflictStrategy: ConflictStrategy;

  /** Whether to sync tags */
  syncTags?: boolean;

  /** Whether to sync sections */
  syncSections?: boolean;

  /** Whether to sync subtasks */
  syncSubtasks?: boolean;

  /** Whether to sync comments */
  syncComments?: boolean;

  /** Whether to sync attachments */
  syncAttachments?: boolean;

  /** Whether to sync dependencies */
  syncDependencies?: boolean;

  /** Whether to sync time entries */
  syncTimeEntries?: boolean;

  /** Whether to sync custom fields */
  syncCustomFields?: boolean;

  /** Dry run mode (don't actually write changes) */
  dryRun?: boolean;

  /** Batch size for syncing */
  batchSize?: number;

  /** Field mapping between backends (for custom field names, etc.) */
  fieldMapping?: Record<string, Record<string, string>>;

  /** Filter for which tasks to sync */
  filter?: {
    /** Only sync completed tasks */
    completed?: boolean;

    /** Only sync tasks with specific tags */
    tags?: string[];

    /** Only sync tasks in specific sections */
    sections?: string[];

    /** Only sync tasks assigned to specific users */
    assignees?: string[];

    /** Only sync tasks modified after this date */
    modifiedAfter?: string;

    /** Custom filter function */
    customFilter?: (task: Task) => boolean;
  };

  /** Callbacks for sync events */
  callbacks?: {
    onProgress?: (progress: SyncProgress) => void;
    onConflict?: (conflict: SyncConflict) => Promise<any>;
    onError?: (error: SyncError) => void;
  };
}

/**
 * Sync progress information.
 */
export interface SyncProgress {
  /** Current phase */
  phase: 'detecting-changes' | 'resolving-conflicts' | 'syncing' | 'finalizing';

  /** Progress percentage (0-100) */
  percentage: number;

  /** Current item being processed */
  currentItem?: string;

  /** Items processed so far */
  itemsProcessed: number;

  /** Total items to process */
  totalItems: number;

  /** Current stats */
  stats: SyncStats;
}

/**
 * Detected change in an item.
 */
export interface ItemChange {
  /** Item ID in the source backend */
  itemId: string;

  /** Type of change */
  changeType: 'created' | 'updated' | 'deleted';

  /** Source backend */
  sourceBackend: string;

  /** Changed fields (for updates) */
  changedFields?: string[];

  /** Old values (for updates) */
  oldValues?: Partial<Task>;

  /** New values */
  newValues?: Partial<Task>;

  /** When change was detected */
  detectedAt: string;
}

/**
 * Mapping entry between backend IDs.
 */
export interface IdMapping {
  /** Sync ID */
  syncId: string;

  /** Source backend ID */
  sourceBackend: string;

  /** Source item ID */
  sourceId: string;

  /** Target backend ID */
  targetBackend: string;

  /** Target item ID */
  targetId: string;

  /** When mapping was created */
  createdAt: string;

  /** When mapping was last verified */
  lastVerifiedAt: string;
}
