/**
 * RowId Lookup Service
 *
 * Handles read-only operations for rowId-based lookups.
 * Provides O(1) partition resolution + O(n) partition scan.
 */

import { join } from 'path';
import { NamespaceMetadataManager } from '../namespace-metadata.manager';
import { RowIdGenerator } from '../rowid.generator';
import { RowIdLookupResult, RowIdConfig } from '../rowid.types';
import { RowIdStorageAdapter } from './storage.adapter';

/**
 * Service for looking up items by rowId
 */
export class RowIdLookupService {
  private basePath: string;
  private metadataManager: NamespaceMetadataManager;
  private rowIdGenerator: RowIdGenerator;
  private storage: RowIdStorageAdapter;

  constructor(basePath: string, rowIdConfig?: Partial<RowIdConfig>) {
    this.basePath = basePath;
    this.metadataManager = new NamespaceMetadataManager();
    this.rowIdGenerator = new RowIdGenerator(rowIdConfig);
    this.storage = new RowIdStorageAdapter();
  }

  /**
   * Lookup item by rowId with direct partition resolution
   *
   * @param namespace - Namespace name
   * @param rowId - Partition-aware row ID
   * @param idField - Field containing the rowId (default: 'rowId')
   */
  async lookupByRowId<T = any>(
    namespace: string,
    rowId: string,
    idField: string = 'rowId'
  ): Promise<RowIdLookupResult<T>> {
    const startTime = Date.now();

    // Load metadata
    const metadata = await this.metadataManager.loadMetadata(this.basePath, namespace);

    // Parse rowId to get partition path
    const parsedRowId = this.rowIdGenerator.parseRowId(rowId, metadata);

    // Build file path
    const dataFile = metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json';
    const filePath = join(
      this.basePath,
      namespace,
      'data',
      parsedRowId.partitionPath,
      dataFile
    );

    // Read partition data
    try {
      const items = await this.storage.readDataFile<T>(filePath, metadata.dataFormat);

      // Find item by rowId
      const item = items.find((item: any) => item[idField] === rowId);

      return {
        found: !!item,
        item,
        parsedRowId,
        filePath,
        lookupTime: Date.now() - startTime
      };
    } catch (error) {
      // Partition doesn't exist
      return {
        found: false,
        parsedRowId,
        filePath,
        lookupTime: Date.now() - startTime
      };
    }
  }

  /**
   * Lookup multiple items by rowIds (batched)
   *
   * Groups rowIds by partition for efficient batch reads.
   */
  async lookupManyByRowId<T = any>(
    namespace: string,
    rowIds: string[],
    idField: string = 'rowId'
  ): Promise<Map<string, RowIdLookupResult<T>>> {
    const results = new Map<string, RowIdLookupResult<T>>();

    // Load metadata once
    const metadata = await this.metadataManager.loadMetadata(this.basePath, namespace);

    // Group rowIds by partition for batch reads
    const partitionGroups = new Map<string, string[]>();

    for (const rowId of rowIds) {
      const parsedRowId = this.rowIdGenerator.parseRowId(rowId, metadata);
      const partitionPath = parsedRowId.partitionPath;

      if (!partitionGroups.has(partitionPath)) {
        partitionGroups.set(partitionPath, []);
      }

      partitionGroups.get(partitionPath)!.push(rowId);
    }

    // Read each partition once and find all matching items
    for (const [partitionPath, partitionRowIds] of partitionGroups.entries()) {
      const dataFile = metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json';
      const filePath = join(this.basePath, namespace, 'data', partitionPath, dataFile);

      const startTime = Date.now();

      try {
        const items = await this.storage.readDataFile<T>(filePath, metadata.dataFormat);

        // Create lookup map for this partition
        const itemMap = new Map<string, T>();
        for (const item of items) {
          const itemRowId = (item as any)[idField];
          if (itemRowId) {
            itemMap.set(itemRowId, item);
          }
        }

        // Find items for each rowId
        for (const rowId of partitionRowIds) {
          const parsedRowId = this.rowIdGenerator.parseRowId(rowId, metadata);
          const item = itemMap.get(rowId);

          results.set(rowId, {
            found: !!item,
            item,
            parsedRowId,
            filePath,
            lookupTime: Date.now() - startTime
          });
        }
      } catch (error) {
        // Partition doesn't exist - mark all as not found
        for (const rowId of partitionRowIds) {
          const parsedRowId = this.rowIdGenerator.parseRowId(rowId, metadata);

          results.set(rowId, {
            found: false,
            parsedRowId,
            filePath,
            lookupTime: Date.now() - startTime
          });
        }
      }
    }

    return results;
  }

  /**
   * Check if item exists by rowId (faster than full lookup)
   */
  async existsByRowId(
    namespace: string,
    rowId: string,
    idField: string = 'rowId'
  ): Promise<boolean> {
    const result = await this.lookupByRowId(namespace, rowId, idField);
    return result.found;
  }

  /**
   * Get all items in a partition containing the given rowId
   */
  async getPartitionItems<T = any>(
    namespace: string,
    rowId: string
  ): Promise<T[]> {
    const metadata = await this.metadataManager.loadMetadata(this.basePath, namespace);
    const parsedRowId = this.rowIdGenerator.parseRowId(rowId, metadata);

    const dataFile = metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json';
    const filePath = join(
      this.basePath,
      namespace,
      'data',
      parsedRowId.partitionPath,
      dataFile
    );

    try {
      return await this.storage.readDataFile<T>(filePath, metadata.dataFormat);
    } catch (error) {
      return [];
    }
  }
}
