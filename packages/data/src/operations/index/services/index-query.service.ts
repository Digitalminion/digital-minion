/**
 * Index Query Service
 *
 * Handles lookups and set operations on indexes.
 */

import { IndexConfig } from '../index.types';

export class IndexQueryService {
  /**
   * Lookup items by index
   */
  lookup(
    indexName: string,
    value: any,
    indexes: Map<string, Map<any, Set<string>>>,
    indexConfigs: Map<string, IndexConfig>
  ): Set<string> {
    const index = indexes.get(indexName);
    const config = indexConfigs.get(indexName);

    if (!index || !config) {
      throw new Error(`Index ${indexName} not found`);
    }

    const indexKey = this.normalizeIndexKey(value, config);
    return index.get(indexKey) || new Set();
  }

  /**
   * Lookup with multiple values (OR operation)
   */
  lookupMultiple(
    indexName: string,
    values: any[],
    indexes: Map<string, Map<any, Set<string>>>,
    indexConfigs: Map<string, IndexConfig>
  ): Set<string> {
    const results = new Set<string>();

    for (const value of values) {
      const itemIds = this.lookup(indexName, value, indexes, indexConfigs);
      itemIds.forEach(id => results.add(id));
    }

    return results;
  }

  /**
   * Range query on index (for ordered values)
   */
  lookupRange(
    indexName: string,
    min: any | undefined,
    max: any | undefined,
    inclusive: boolean,
    indexes: Map<string, Map<any, Set<string>>>
  ): Set<string> {
    const index = indexes.get(indexName);

    if (!index) {
      throw new Error(`Index ${indexName} not found`);
    }

    const results = new Set<string>();

    for (const [key, itemIds] of index.entries()) {
      const matchesMin = min === undefined || (inclusive ? key >= min : key > min);
      const matchesMax = max === undefined || (inclusive ? key <= max : key < max);

      if (matchesMin && matchesMax) {
        itemIds.forEach(id => results.add(id));
      }
    }

    return results;
  }

  /**
   * Intersect multiple index lookups (AND operation)
   */
  intersect(...itemSets: Set<string>[]): Set<string> {
    if (itemSets.length === 0) return new Set();
    if (itemSets.length === 1) return itemSets[0] || new Set();

    // Start with smallest set for efficiency
    const sorted = itemSets.sort((a, b) => a.size - b.size);
    const result = new Set(sorted[0] || []);

    for (let i = 1; i < sorted.length; i++) {
      const currentSet = sorted[i];
      if (!currentSet) continue;

      for (const item of result) {
        if (!currentSet.has(item)) {
          result.delete(item);
        }
      }
    }

    return result;
  }

  /**
   * Union multiple index lookups (OR operation)
   */
  union(...itemSets: Set<string>[]): Set<string> {
    const result = new Set<string>();

    for (const set of itemSets) {
      set.forEach(item => result.add(item));
    }

    return result;
  }

  /**
   * Difference between sets (A - B)
   */
  difference(setA: Set<string>, setB: Set<string>): Set<string> {
    const result = new Set(setA);

    for (const item of setB) {
      result.delete(item);
    }

    return result;
  }

  /**
   * Get items by IDs
   */
  getItems<T>(itemIds: Set<string>, itemStore: Map<string, T>): T[] {
    const items: T[] = [];

    for (const id of itemIds) {
      const item = itemStore.get(id);
      if (item) {
        items.push(item);
      }
    }

    return items;
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
