/**
 * RowId Writer Service
 *
 * Handles write operations (create, update, delete) for rowId-based data.
 * Groups operations by partition for efficiency.
 */

import { join } from 'path';
import { JsonlRowStorage } from '../../storage/jsonl.storage';
import { NamespaceMetadataManager } from '../namespace-metadata.manager';
import { RowIdGenerator } from '../rowid.generator';
import { RowIdConfig } from '../rowid.types';
import { RowIdStorageAdapter } from './storage.adapter';

/**
 * Service for writing (create, update, delete) items by rowId
 */
export class RowIdWriterService {
  private basePath: string;
  private metadataManager: NamespaceMetadataManager;
  private rowIdGenerator: RowIdGenerator;
  private storage: RowIdStorageAdapter;
  private jsonlStorage: JsonlRowStorage;

  constructor(basePath: string, rowIdConfig?: Partial<RowIdConfig>) {
    this.basePath = basePath;
    this.metadataManager = new NamespaceMetadataManager();
    this.rowIdGenerator = new RowIdGenerator(rowIdConfig);
    this.storage = new RowIdStorageAdapter();
    this.jsonlStorage = new JsonlRowStorage();
  }

  /**
   * Create item with rowId
   *
   * @param namespace - Namespace name
   * @param item - Item to create (must have rowId field)
   * @param idField - Field containing the rowId
   */
  async createByRowId<T = any>(
    namespace: string,
    item: T,
    idField: string = 'rowId'
  ): Promise<T> {
    const metadata = await this.metadataManager.loadMetadata(this.basePath, namespace);

    // Ensure item has rowId
    const itemRowId = (item as any)[idField];
    if (!itemRowId) {
      throw new Error(`Item must have '${idField}' field for creation`);
    }

    // Parse rowId to get partition path
    const parsedRowId = this.rowIdGenerator.parseRowId(itemRowId, metadata);

    const dataFile = metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json';
    const filePath = join(
      this.basePath,
      namespace,
      'data',
      parsedRowId.partitionPath,
      dataFile
    );

    // Ensure partition directory exists
    const partitionDir = join(this.basePath, namespace, 'data', parsedRowId.partitionPath);
    await this.storage.ensureDirectoryExists(partitionDir);

    // Check if item already exists
    try {
      const items = await this.storage.readDataFile<T>(filePath, metadata.dataFormat);
      const exists = items.some((existingItem: any) => existingItem[idField] === itemRowId);

      if (exists) {
        throw new Error(`Item with ${idField} '${itemRowId}' already exists`);
      }

      // Append new item
      if (metadata.dataFormat === 'jsonl') {
        await this.jsonlStorage.appendRow(filePath, item);
      } else {
        items.push(item);
        await this.storage.writeDataFile(filePath, items, metadata.dataFormat);
      }

      return item;
    } catch (error: any) {
      // If file doesn't exist, create it with the item
      if (error.message?.includes('not found') || error.code === 'ENOENT') {
        await this.storage.writeDataFile(filePath, [item], metadata.dataFormat);
        return item;
      }

      throw error;
    }
  }

  /**
   * Create multiple items (batched)
   *
   * Groups items by partition for efficient batch writes.
   */
  async createManyByRowId<T = any>(
    namespace: string,
    items: T[],
    idField: string = 'rowId'
  ): Promise<T[]> {
    const metadata = await this.metadataManager.loadMetadata(this.basePath, namespace);

    // Group items by partition
    const partitionGroups = new Map<string, T[]>();

    for (const item of items) {
      const itemRowId = (item as any)[idField];
      if (!itemRowId) {
        throw new Error(`All items must have '${idField}' field for batch creation`);
      }

      const parsedRowId = this.rowIdGenerator.parseRowId(itemRowId, metadata);
      const partitionPath = parsedRowId.partitionPath;

      if (!partitionGroups.has(partitionPath)) {
        partitionGroups.set(partitionPath, []);
      }

      partitionGroups.get(partitionPath)!.push(item);
    }

    // Write to each partition
    for (const [partitionPath, partitionItems] of partitionGroups.entries()) {
      const dataFile = metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json';
      const filePath = join(this.basePath, namespace, 'data', partitionPath, dataFile);

      // Ensure partition directory exists
      const partitionDir = join(this.basePath, namespace, 'data', partitionPath);
      await this.storage.ensureDirectoryExists(partitionDir);

      try {
        // Read existing items
        const existingItems = await this.storage.readDataFile<T>(filePath, metadata.dataFormat);

        // Check for duplicates
        const existingIds = new Set(existingItems.map((item: any) => item[idField]));
        for (const item of partitionItems) {
          const itemRowId = (item as any)[idField];
          if (existingIds.has(itemRowId)) {
            throw new Error(`Item with ${idField} '${itemRowId}' already exists`);
          }
        }

        // Append new items
        if (metadata.dataFormat === 'jsonl') {
          await this.jsonlStorage.appendRows(filePath, partitionItems);
        } else {
          const allItems = [...existingItems, ...partitionItems];
          await this.storage.writeDataFile(filePath, allItems, metadata.dataFormat);
        }
      } catch (error: any) {
        // If file doesn't exist, create it
        if (error.message?.includes('not found') || error.code === 'ENOENT') {
          await this.storage.writeDataFile(filePath, partitionItems, metadata.dataFormat);
        } else {
          throw error;
        }
      }
    }

    return items;
  }

  /**
   * Delete item by rowId
   */
  async deleteByRowId(
    namespace: string,
    rowId: string,
    idField: string = 'rowId'
  ): Promise<boolean> {
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
      const items = await this.storage.readDataFile(filePath, metadata.dataFormat);

      // Find and remove item
      const initialLength = items.length;
      const filteredItems = items.filter((item: any) => item[idField] !== rowId);

      if (filteredItems.length === initialLength) {
        return false; // Item not found
      }

      // Write back filtered items
      await this.storage.writeDataFile(filePath, filteredItems, metadata.dataFormat);

      return true;
    } catch (error) {
      return false; // Partition doesn't exist
    }
  }

  /**
   * Update item by rowId
   */
  async updateByRowId<T = any>(
    namespace: string,
    rowId: string,
    updates: Partial<T>,
    idField: string = 'rowId'
  ): Promise<T | undefined> {
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
      const items = await this.storage.readDataFile<T>(filePath, metadata.dataFormat);

      // Find and update item
      let updatedItem: T | undefined;
      const updatedItems = items.map((item: any) => {
        if (item[idField] === rowId) {
          updatedItem = { ...item, ...updates };
          return updatedItem;
        }
        return item;
      });

      if (!updatedItem) {
        return undefined; // Item not found
      }

      // Write back updated items
      await this.storage.writeDataFile(filePath, updatedItems, metadata.dataFormat);

      return updatedItem as T;
    } catch (error) {
      return undefined; // Partition doesn't exist
    }
  }
}
