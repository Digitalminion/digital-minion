/**
 * Index Builder Service
 *
 * Handles building and maintaining indexes from items.
 */

import { IndexConfig } from '../index.types';

export class IndexBuilderService<T = any> {
  /**
   * Build index from items
   */
  buildIndex<TItem extends T>(
    index: Map<any, Set<string>>,
    config: IndexConfig,
    items: TItem[],
    getIdFn: (item: TItem) => string,
    itemStore: Map<string, T>
  ): { buildTime: number } {
    const startTime = Date.now();

    // Clear existing index
    index.clear();

    // Build index
    for (const item of items) {
      const itemId = getIdFn(item);
      itemStore.set(itemId, item);

      for (const field of config.fields) {
        const value = this.getFieldValue(item, field);

        // Skip null/undefined if sparse index
        if (config.sparse === false && (value === null || value === undefined)) {
          continue;
        }

        // Normalize value for case-insensitive strings
        const indexKey = this.normalizeIndexKey(value, config);

        // Add to index
        if (!index.has(indexKey)) {
          index.set(indexKey, new Set());
        }
        index.get(indexKey)!.add(itemId);

        // Validate uniqueness if required
        if (config.unique && index.get(indexKey)!.size > 1) {
          throw new Error(
            `Unique constraint violation for value: ${indexKey}`
          );
        }
      }
    }

    return { buildTime: Date.now() - startTime };
  }

  /**
   * Add item to index
   */
  addItem<TItem extends T>(
    item: TItem,
    getIdFn: (item: TItem) => string,
    indexes: Map<string, Map<any, Set<string>>>,
    indexConfigs: Map<string, IndexConfig>,
    itemStore: Map<string, T>
  ): void {
    const itemId = getIdFn(item);
    itemStore.set(itemId, item);

    for (const [indexName, index] of indexes.entries()) {
      const config = indexConfigs.get(indexName)!;

      for (const field of config.fields) {
        const value = this.getFieldValue(item, field);

        if (config.sparse === false && (value === null || value === undefined)) {
          continue;
        }

        const indexKey = this.normalizeIndexKey(value, config);

        if (!index.has(indexKey)) {
          index.set(indexKey, new Set());
        }
        index.get(indexKey)!.add(itemId);

        // Validate uniqueness
        if (config.unique && index.get(indexKey)!.size > 1) {
          // Rollback
          index.get(indexKey)!.delete(itemId);
          throw new Error(
            `Unique constraint violation on index ${indexName} for value: ${indexKey}`
          );
        }
      }
    }
  }

  /**
   * Remove item from indexes
   */
  removeItem(
    itemId: string,
    indexes: Map<string, Map<any, Set<string>>>,
    indexConfigs: Map<string, IndexConfig>,
    itemStore: Map<string, T>
  ): void {
    const item = itemStore.get(itemId);
    if (!item) return;

    for (const [indexName, index] of indexes.entries()) {
      const config = indexConfigs.get(indexName);
      if (!config) continue;

      for (const field of config.fields) {
        const value = this.getFieldValue(item, field);
        const indexKey = this.normalizeIndexKey(value, config);

        const itemSet = index.get(indexKey);
        if (itemSet) {
          itemSet.delete(itemId);
          if (itemSet.size === 0) {
            index.delete(indexKey);
          }
        }
      }
    }

    itemStore.delete(itemId);
  }

  /**
   * Get field value from object (supports nested paths)
   */
  private getFieldValue(obj: any, path: string): any {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Normalize index key based on configuration
   */
  private normalizeIndexKey(value: any, config: IndexConfig): any {
    if (typeof value === 'string' && !config.caseSensitive) {
      return value.toLowerCase();
    }

    return value;
  }
}
