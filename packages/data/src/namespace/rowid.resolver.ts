/**
 * RowId Resolver
 *
 * Performs O(1) lookups using partition-aware rowIds to directly locate
 * items without scanning the entire dataset.
 *
 * The RowId system encodes partition hierarchy into the ID itself, enabling:
 * - Direct partition resolution from rowId
 * - No map-reduce across all partitions
 * - O(1) partition location + O(n) partition scan (where n = items in partition)
 *
 * @example
 * ```typescript
 * const resolver = new RowIdResolver({ basePath: './data' });
 *
 * // Direct lookup by rowId
 * const result = await resolver.lookupByRowId('transactions', '2025.US.TX.guid-123');
 * if (result.found) {
 *   console.log('Found item:', result.item);
 *   console.log('Lookup took:', result.lookupTime, 'ms');
 * }
 *
 * // Batch lookup
 * const results = await resolver.lookupManyByRowId('transactions', [
 *   '2025.US.TX.guid-123',
 *   '2025.US.CA.guid-456'
 * ]);
 *
 * // CRUD operations
 * await resolver.createByRowId('transactions', item);
 * await resolver.updateByRowId('transactions', rowId, updates);
 * await resolver.deleteByRowId('transactions', rowId);
 * ```
 */

import { RowIdLookupResult, RowIdConfig } from './rowid.types';
import { RowIdLookupService } from './rowid/lookup.service';
import { RowIdWriterService } from './rowid/writer.service';

export interface RowIdResolverConfig {
  basePath: string;
  rowIdConfig?: Partial<RowIdConfig>;
}

/**
 * Resolves rowIds to items via direct partition lookup
 *
 * This is a facade that delegates to specialized services:
 * - RowIdLookupService: Read operations
 * - RowIdWriterService: Write operations
 */
export class RowIdResolver {
  private lookup: RowIdLookupService;
  private writer: RowIdWriterService;

  constructor(config: RowIdResolverConfig) {
    this.lookup = new RowIdLookupService(config.basePath, config.rowIdConfig);
    this.writer = new RowIdWriterService(config.basePath, config.rowIdConfig);
  }

  /**
   * Lookup item by rowId with direct partition resolution
   *
   * Parses the rowId to determine the exact partition path, then scans only
   * that partition file for the item. This avoids scanning the entire dataset.
   *
   * @param namespace - Namespace name
   * @param rowId - Partition-aware row ID (e.g., "2025.US.TX.guid-123")
   * @param idField - Field name containing the rowId (default: 'rowId')
   * @returns Lookup result with item (if found), partition info, and timing
   *
   * @example
   * ```typescript
   * const result = await resolver.lookupByRowId('transactions', '2025.US.guid-123');
   * if (result.found) {
   *   console.log('Item:', result.item);
   *   console.log('File:', result.filePath);
   *   console.log('Time:', result.lookupTime, 'ms');
   * }
   * ```
   */
  async lookupByRowId<T = any>(
    namespace: string,
    rowId: string,
    idField: string = 'rowId'
  ): Promise<RowIdLookupResult<T>> {
    return this.lookup.lookupByRowId<T>(namespace, rowId, idField);
  }

  /**
   * Lookup multiple items by rowIds (batched)
   */
  async lookupManyByRowId<T = any>(
    namespace: string,
    rowIds: string[],
    idField: string = 'rowId'
  ): Promise<Map<string, RowIdLookupResult<T>>> {
    return this.lookup.lookupManyByRowId<T>(namespace, rowIds, idField);
  }

  /**
   * Check if item exists by rowId (faster than full lookup)
   */
  async existsByRowId(
    namespace: string,
    rowId: string,
    idField: string = 'rowId'
  ): Promise<boolean> {
    return this.lookup.existsByRowId(namespace, rowId, idField);
  }

  /**
   * Create/insert new item with rowId
   *
   * Writes item to the partition determined by the rowId.
   * The item must already have a valid rowId field.
   *
   * @param namespace - Namespace name
   * @param item - Item to create (must include rowId field)
   * @param idField - Field name containing the rowId (default: 'rowId')
   * @returns Created item
   * @throws Error if item already exists or missing rowId
   *
   * @example
   * ```typescript
   * const item = {
   *   rowId: '2025.US.guid-123',
   *   year: '2025',
   *   country: 'US',
   *   amount: 100
   * };
   * await resolver.createByRowId('transactions', item);
   * ```
   */
  async createByRowId<T = any>(
    namespace: string,
    item: T,
    idField: string = 'rowId'
  ): Promise<T> {
    return this.writer.createByRowId<T>(namespace, item, idField);
  }

  /**
   * Create multiple items with rowIds (batch)
   */
  async createManyByRowId<T = any>(
    namespace: string,
    items: T[],
    idField: string = 'rowId'
  ): Promise<T[]> {
    return this.writer.createManyByRowId<T>(namespace, items, idField);
  }

  /**
   * Delete item by rowId
   *
   * Locates and removes item from partition.
   *
   * @param namespace - Namespace name
   * @param rowId - Row ID to delete
   * @param idField - Field name containing the rowId (default: 'rowId')
   * @returns True if deleted, false if not found
   *
   * @example
   * ```typescript
   * const deleted = await resolver.deleteByRowId('transactions', '2025.US.guid-123');
   * console.log('Deleted:', deleted);
   * ```
   */
  async deleteByRowId(
    namespace: string,
    rowId: string,
    idField: string = 'rowId'
  ): Promise<boolean> {
    return this.writer.deleteByRowId(namespace, rowId, idField);
  }

  /**
   * Update item by rowId
   *
   * Locates item via rowId and applies partial updates.
   *
   * @param namespace - Namespace name
   * @param rowId - Row ID to update
   * @param updates - Partial updates to apply
   * @param idField - Field name containing the rowId (default: 'rowId')
   * @returns Updated item, or undefined if not found
   *
   * @example
   * ```typescript
   * const updated = await resolver.updateByRowId('transactions', '2025.US.guid-123', {
   *   amount: 150,
   *   status: 'completed'
   * });
   * ```
   */
  async updateByRowId<T = any>(
    namespace: string,
    rowId: string,
    updates: Partial<T>,
    idField: string = 'rowId'
  ): Promise<T | undefined> {
    return this.writer.updateByRowId<T>(namespace, rowId, updates, idField);
  }

  /**
   * Get all items in partition containing rowId
   */
  async getPartitionItems<T = any>(
    namespace: string,
    rowId: string
  ): Promise<T[]> {
    return this.lookup.getPartitionItems<T>(namespace, rowId);
  }
}
