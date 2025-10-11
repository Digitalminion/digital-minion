/**
 * Core Data Types for Generic Data Layer
 *
 * Provides type-safe interfaces for partition-based data access,
 * map-reduce operations, and query execution.
 */

/**
 * Partition represents a logical data segment (namespace, shard, file, etc.)
 */
export interface Partition<T = any> {
  id: string;
  name: string;
  type: 'file' | 'database' | 'memory' | 'remote';
  location: string;
  metadata?: PartitionMetadata;
  schema?: PartitionSchema<T>;
}

export interface PartitionMetadata {
  created_at: string;
  updated_at: string;
  size?: number;
  itemCount?: number;
  tags?: string[];
  description?: string;
  [key: string]: any;
}

export interface PartitionSchema<T> {
  version: string;
  fields: FieldDefinition[];
  indexes?: IndexDefinition[];
  validators?: SchemaValidator<T>[];
}

export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required?: boolean;
  indexed?: boolean;
  defaultValue?: any;
  validators?: FieldValidator[];
}

export interface IndexDefinition {
  name: string;
  fields: string[];
  unique?: boolean;
  sparse?: boolean;
}

export type FieldValidator = (value: any) => boolean | string;
export type SchemaValidator<T> = (item: T) => boolean | string;

/**
 * Query criteria for data retrieval
 */
export interface Query<T = any> {
  filters?: FilterCriteria<T>;
  sort?: SortCriteria<T>;
  limit?: number;
  offset?: number;
  partitions?: string[]; // Specific partitions to query
  includeMetadata?: boolean;
}

export interface FilterCriteria<T = any> {
  [key: string]: FilterValue | FilterOperator<T>;
}

export type FilterValue = string | number | boolean | Date | null | FilterValue[];

export interface FilterOperator<T = any> {
  $eq?: any;
  $ne?: any;
  $gt?: any;
  $gte?: any;
  $lt?: any;
  $lte?: any;
  $in?: any[];
  $nin?: any[];
  $exists?: boolean;
  $regex?: string | RegExp;
  $and?: FilterCriteria<T>[];
  $or?: FilterCriteria<T>[];
  $not?: FilterCriteria<T>;
  $custom?: (item: T) => boolean;
}

export interface SortCriteria<T = any> {
  field: keyof T | string;
  direction: 'asc' | 'desc';
}

/**
 * Query result with metadata
 */
export interface QueryResult<T = any> {
  data: T[];
  metadata: QueryMetadata;
}

export interface QueryMetadata {
  totalCount: number;
  returnedCount: number;
  partitionsQueried: string[];
  executionTime: number;
  cacheHit: boolean;
  warnings?: string[];
}

/**
 * Map-Reduce operation types
 */
export interface MapReduceOperation<TInput, TOutput> {
  map: MapFunction<TInput>;
  reduce: ReduceFunction<TOutput>;
  options?: MapReduceOptions;
}

export type MapFunction<T> = (item: T, partition: string) => any[];
export type ReduceFunction<T> = (key: string, values: any[]) => T;

export interface MapReduceOptions {
  parallel?: boolean;
  chunkSize?: number;
  timeout?: number;
  retryOnFailure?: boolean;
}

export interface MapReduceResult<T> {
  results: T[];
  statistics: MapReduceStatistics;
}

export interface MapReduceStatistics {
  itemsProcessed: number;
  partitionsProcessed: number;
  executionTime: number;
  failures: number;
  retries: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  strategy: 'lru' | 'lfu' | 'fifo';
  invalidateOn?: CacheInvalidationRule[];
}

export interface CacheInvalidationRule {
  event: 'create' | 'update' | 'delete';
  partitions?: string[];
  patterns?: string[];
}

/**
 * Stream processing types
 */
export interface StreamOptions {
  chunkSize?: number;
  maxMemoryUsage?: number;
  enableEarlyTermination?: boolean;
  progressCallback?: (progress: StreamProgress) => void;
}

export interface StreamProgress {
  processedItems: number;
  totalItems: number;
  processedPartitions: number;
  totalPartitions: number;
  memoryUsage: number;
  estimatedTimeRemaining?: number;
}

export interface StreamChunk<T> {
  data: T[];
  hasMore: boolean;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  partitionId: string;
  itemCount: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Data source adapter interface
 */
export interface DataSourceAdapter<T = any> {
  type: string;
  connect(config?: any): Promise<void>;
  disconnect(): Promise<void>;
  read(partition: Partition<T>): Promise<T[]>;
  write(partition: Partition<T>, data: T[]): Promise<void>;
  append(partition: Partition<T>, data: T[]): Promise<void>;
  delete(partition: Partition<T>, filter: FilterCriteria<T>): Promise<number>;
  count(partition: Partition<T>): Promise<number>;
  exists(partition: Partition<T>): Promise<boolean>;
}
