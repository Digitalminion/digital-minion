/**
 * Namespace Types
 *
 * Defines types for namespace-based partition management with hierarchical
 * data organization, validation, and maintenance operations.
 */

/**
 * Partition field schema definition
 */
export interface PartitionFieldSchema {
  type: 'string' | 'number' | 'date';
  regex?: string;
  required: boolean;
  defaultValue?: any;
  description?: string;

  /**
   * Function to derive partition value from item data
   * Stored as string, evaluated at runtime
   * Example: "(item) => item.user.country"
   */
  deriveFromData?: string;
}

/**
 * Partition schema configuration
 */
export interface PartitionSchemaConfig {
  /**
   * Ordered list of partition keys
   * Defines the hierarchy: ["year", "country"] creates year=X/country=Y/
   */
  order: string[];

  /**
   * Partition field definitions
   */
  partitions: Record<string, PartitionFieldSchema>;
}

/**
 * Information about a discovered partition
 */
export interface PartitionInfo {
  /**
   * Full partition path relative to namespace/data/
   * Example: "year=2025/country=US"
   */
  path: string;

  /**
   * Parsed partition values
   * Example: { year: "2025", country: "US" }
   */
  values: Record<string, string>;

  /**
   * Metadata
   */
  created: string;
  itemCount: number;
  lastUpdated: string;
  sizeBytes: number;
}

/**
 * Complete namespace metadata
 */
export interface NamespaceMetadata {
  namespace: string;
  version: string;
  created: string;
  updated: string;

  /**
   * Partition schema definition
   */
  partitionSchema: PartitionSchemaConfig;

  /**
   * Auto-discovered partitions
   */
  discoveredPartitions: PartitionInfo[];

  /**
   * Data storage format
   */
  dataFormat: 'json' | 'jsonl';

  /**
   * Optional item schema for validation
   */
  itemSchema?: object;

  /**
   * Custom metadata
   */
  custom?: Record<string, any>;
}

/**
 * Configuration for adding a new partition level
 */
export interface AddPartitionConfig {
  /**
   * Partition key name
   */
  key: string;

  /**
   * Position in partition order (0-based)
   * Inserts at this position, shifting others right
   */
  position: number;

  /**
   * Field schema
   */
  type: 'string' | 'number' | 'date';
  regex?: string;
  required: boolean;
  defaultValue?: any;
  description?: string;

  /**
   * Function to extract partition value from item
   * Example: "(item) => item.metadata.region"
   */
  deriveFromData: string;
}

/**
 * Configuration for collapsing/removing a partition level
 */
export interface CollapsePartitionConfig {
  /**
   * Partition key to remove
   */
  key: string;

  /**
   * Whether to merge data from all splits
   */
  merge: boolean;
}

/**
 * Validation result for writes
 */
export interface PartitionValidationResult {
  isValid: boolean;
  errors: PartitionValidationError[];
  partitionPath?: string;
  partitionValues?: Record<string, any>;
}

export interface PartitionValidationError {
  field: string;
  message: string;
  code: 'MISSING_REQUIRED' | 'INVALID_FORMAT' | 'REGEX_MISMATCH' | 'TYPE_MISMATCH';
  expected?: any;
  actual?: any;
}

/**
 * Maintenance job configuration
 */
export interface MaintenanceJobConfig {
  namespace: string;
  operation: 'split' | 'merge';
  partitionKey?: string;
  dryRun?: boolean;
  parallel?: boolean;
  chunkSize?: number;
}

/**
 * Maintenance job result
 */
export interface MaintenanceJobResult {
  success: boolean;
  operation: 'split' | 'merge';
  partitionsProcessed: number;
  itemsProcessed: number;
  partitionsCreated: number;
  partitionsDeleted: number;
  executionTime: number;
  errors: MaintenanceJobError[];
}

export interface MaintenanceJobError {
  partition: string;
  error: string;
  recoverable: boolean;
}

/**
 * Query options with partition support
 */
export interface NamespaceQueryOptions {
  /**
   * Partition filter
   * Example: { year: "2025", country: "US" }
   * Omitted keys query all values at that level
   */
  partitionFilter?: Record<string, string | string[]>;

  /**
   * Item-level filters
   */
  itemFilter?: Record<string, any>;

  /**
   * Sorting
   */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };

  /**
   * Pagination
   */
  limit?: number;
  offset?: number;
}

/**
 * Namespace statistics
 */
export interface NamespaceStatistics {
  namespace: string;
  totalPartitions: number;
  totalItems: number;
  totalSizeBytes: number;
  partitionDistribution: Record<string, number>;
  lastUpdated: string;
}
