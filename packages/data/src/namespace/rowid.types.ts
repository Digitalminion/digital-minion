/**
 * RowId Types
 *
 * Partition-aware composite keys that encode partition hierarchy for O(1) lookups
 */

/**
 * Parsed RowId structure
 */
export interface ParsedRowId {
  /**
   * Full rowId string
   */
  rowId: string;

  /**
   * Partition values in order
   * Example: ["2025", "US", "TX"]
   */
  partitionValues: string[];

  /**
   * Partition path
   * Example: "year=2025/country=US/state=TX"
   */
  partitionPath: string;

  /**
   * Unique identifier within partition
   * Example: "35asfag-afdag-adg25"
   */
  guid: string;

  /**
   * Partition key-value map
   * Example: { year: "2025", country: "US", state: "TX" }
   */
  partitionMap: Record<string, string>;
}

/**
 * RowId generation options
 */
export interface RowIdGenerationOptions {
  /**
   * Custom separator (default: ".")
   */
  separator?: string;

  /**
   * Custom GUID generator
   */
  guidGenerator?: () => string;

  /**
   * Include partition keys in rowId (makes it more readable but longer)
   * If true: "year=2025.country=US.guid"
   * If false: "2025.US.guid"
   */
  includeKeys?: boolean;
}

/**
 * RowId configuration for namespace
 */
export interface RowIdConfig {
  /**
   * Separator between partition values
   */
  separator: string;

  /**
   * Whether to include partition keys in rowId
   */
  includeKeys: boolean;

  /**
   * GUID format: 'uuid' | 'short' | 'timestamp'
   */
  guidFormat: 'uuid' | 'short' | 'timestamp';
}

/**
 * Result of rowId lookup
 */
export interface RowIdLookupResult<T = any> {
  /**
   * Whether the item was found
   */
  found: boolean;

  /**
   * The item data (if found)
   */
  item?: T;

  /**
   * Parsed rowId
   */
  parsedRowId: ParsedRowId;

  /**
   * File path where item was found/searched
   */
  filePath: string;

  /**
   * Lookup time in milliseconds
   */
  lookupTime: number;
}
