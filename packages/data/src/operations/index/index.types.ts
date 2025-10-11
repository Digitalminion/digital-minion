/**
 * Index Types
 */

export interface IndexConfig {
  fields: string[]; // Fields to index
  unique?: boolean; // Whether values must be unique
  sparse?: boolean; // Whether to index null/undefined values
  caseSensitive?: boolean; // For string fields
}

export interface IndexEntry {
  value: any;
  itemIds: Set<string>;
}

export interface IndexStatistics {
  totalKeys: number;
  totalItems: number;
  averageItemsPerKey: number;
  buildTime: number;
  memoryUsage: number;
}
