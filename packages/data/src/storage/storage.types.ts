/**
 * Storage Types
 *
 * Core type definitions for JSON-based storage operations.
 * This module defines interfaces for both object storage (single JSON documents)
 * and row storage (JSONL line-delimited records).
 */

/**
 * Options for creating/writing JSON storage
 */
export interface StorageWriteOptions {
  /**
   * Format JSON with indentation for readability
   * @default true
   */
  pretty?: boolean;

  /**
   * Create timestamped backup before overwriting
   * @default true
   */
  backup?: boolean;

  /**
   * Validate data structure before writing
   * @default true
   */
  validate?: boolean;

  /**
   * Overwrite existing file
   * @default false for create, true for write
   */
  overwrite?: boolean;

  /**
   * Create parent directories if they don't exist
   * @default true
   */
  createDirectories?: boolean;

  /**
   * File permissions (Unix)
   * @default 0o644
   */
  permissions?: number;
}

/**
 * Validation result for storage operations
 */
export interface StorageValidationResult {
  /**
   * Whether validation passed
   */
  isValid: boolean;

  /**
   * Validation errors (blocking)
   */
  errors: StorageValidationError[];

  /**
   * Validation warnings (non-blocking)
   */
  warnings: StorageValidationWarning[];
}

/**
 * Validation error
 */
export interface StorageValidationError {
  /**
   * Field or path that failed validation
   */
  field: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Machine-readable error code
   */
  code: 'NULL_DATA' | 'TYPE_MISMATCH' | 'REQUIRED_FIELD_MISSING' | 'INVALID_JSON' | 'FILE_ERROR' | 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM';

  /**
   * Error severity
   */
  severity: 'error' | 'warning' | 'info';

  /**
   * Expected value or type
   */
  expected?: any;

  /**
   * Actual value or type
   */
  actual?: any;
}

/**
 * Validation warning
 */
export interface StorageValidationWarning {
  /**
   * Field or path with warning
   */
  field: string;

  /**
   * Warning message
   */
  message: string;

  /**
   * Warning code
   */
  code: string;

  /**
   * Suggested fix
   */
  suggestion?: string;
}

/**
 * Simple JSON schema for validation
 */
export interface StorageSchema {
  /**
   * Expected data type
   */
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

  /**
   * Object properties (for type: 'object')
   */
  properties?: Record<string, StorageSchema>;

  /**
   * Required fields (for type: 'object')
   */
  required?: string[];

  /**
   * Allow additional properties not in schema
   * @default true
   */
  additionalProperties?: boolean;

  /**
   * Array item type (for type: 'array')
   */
  items?: StorageSchema;

  /**
   * Validation pattern (for type: 'string')
   */
  pattern?: string;

  /**
   * Minimum value (for type: 'number')
   */
  minimum?: number;

  /**
   * Maximum value (for type: 'number')
   */
  maximum?: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /**
   * File path
   */
  path: string;

  /**
   * File size in bytes
   */
  sizeBytes: number;

  /**
   * Number of items/rows (for JSONL)
   */
  itemCount?: number;

  /**
   * Created timestamp
   */
  created: string;

  /**
   * Last modified timestamp
   */
  modified: string;

  /**
   * Last accessed timestamp
   */
  accessed: string;
}

/**
 * Base interface for storage operations
 */
export interface IStorage {
  /**
   * Check if storage file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get storage file statistics
   */
  getStats(path: string): Promise<StorageStats>;

  /**
   * Delete storage file
   */
  delete(path: string): Promise<void>;

  /**
   * Create backup of storage file
   */
  backup(path: string): Promise<string>;
}

/**
 * Interface for object-based JSON storage (single document)
 */
export interface IJsonObjectStorage<T = any> extends IStorage {
  /**
   * Read entire JSON object
   */
  read(path: string): Promise<T>;

  /**
   * Write entire JSON object
   */
  write(path: string, data: T, options?: StorageWriteOptions): Promise<void>;

  /**
   * Update partial JSON object (merge)
   */
  update(path: string, updates: Partial<T>): Promise<T>;

  /**
   * Validate JSON object against schema
   */
  validate(path: string, schema?: StorageSchema): Promise<StorageValidationResult>;
}

/**
 * Interface for row-based JSONL storage (line-delimited JSON)
 */
export interface IJsonRowStorage<T = any> extends IStorage {
  /**
   * Read all rows
   */
  readAll(path: string): Promise<T[]>;

  /**
   * Read rows with limit and offset
   */
  read(path: string, offset?: number, limit?: number): Promise<T[]>;

  /**
   * Write all rows (overwrite)
   */
  writeAll(path: string, rows: T[], options?: StorageWriteOptions): Promise<void>;

  /**
   * Append single row
   */
  appendRow(path: string, row: T): Promise<void>;

  /**
   * Append multiple rows
   */
  appendRows(path: string, rows: T[]): Promise<void>;

  /**
   * Count total rows
   */
  count(path: string): Promise<number>;

  /**
   * Stream rows (for large files)
   */
  stream(path: string, chunkSize?: number): AsyncGenerator<T[], void, unknown>;
}
