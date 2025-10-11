/**
 * Generic Index Manager - Refactored
 *
 * Clean facade over specialized services:
 * - IndexBuilderService: Building and maintaining indexes
 * - IndexQueryService: Lookups and set operations
 * - IndexStatsService: Statistics calculation
 */

import { IndexBuilderService } from './services/index-builder.service';
import { IndexQueryService } from './services/index-query.service';
import { IndexStatsService } from './services/index-stats.service';
import { IndexConfig, IndexStatistics } from './index.types';

/**
 * Generic Index Manager for fast lookups
 */
export class IndexManager<T = any> {
  private indexes: Map<string, Map<any, Set<string>>> = new Map();
  private indexConfigs: Map<string, IndexConfig> = new Map();
  private itemStore: Map<string, T> = new Map();
  private statistics: Map<string, IndexStatistics> = new Map();

  private builderService: IndexBuilderService<T>;
  private queryService: IndexQueryService;
  private statsService: IndexStatsService;

  constructor() {
    this.builderService = new IndexBuilderService<T>();
    this.queryService = new IndexQueryService();
    this.statsService = new IndexStatsService();
  }

  /**
   * Create an index on specified fields
   */
  createIndex(indexName: string, config: IndexConfig): void {
    if (this.indexes.has(indexName)) {
      throw new Error(`Index ${indexName} already exists`);
    }

    this.indexes.set(indexName, new Map());
    this.indexConfigs.set(indexName, config);
  }

  /**
   * Build index from items
   */
  buildIndex<TItem extends T>(
    indexName: string,
    items: TItem[],
    getIdFn: (item: TItem) => string
  ): void {
    const index = this.indexes.get(indexName);
    const config = this.indexConfigs.get(indexName);

    if (!index || !config) {
      throw new Error(`Index ${indexName} not found. Create it first.`);
    }

    const { buildTime } = this.builderService.buildIndex(
      index,
      config,
      items,
      getIdFn,
      this.itemStore
    );

    // Update statistics
    const stats = this.statsService.calculateStatistics(indexName, index, buildTime);
    this.statistics.set(indexName, stats);
  }

  /**
   * Add item to existing indexes
   */
  addItem<TItem extends T>(item: TItem, getIdFn: (item: TItem) => string): void {
    this.builderService.addItem(item, getIdFn, this.indexes, this.indexConfigs, this.itemStore);
  }

  /**
   * Remove item from indexes
   */
  removeItem(itemId: string): void {
    this.builderService.removeItem(itemId, this.indexes, this.indexConfigs, this.itemStore);
  }

  /**
   * Update item in indexes
   */
  updateItem<TItem extends T>(item: TItem, getIdFn: (item: TItem) => string): void {
    const itemId = getIdFn(item);
    this.removeItem(itemId);
    this.addItem(item, getIdFn);
  }

  /**
   * Lookup items by index
   */
  lookup(indexName: string, value: any): Set<string> {
    return this.queryService.lookup(indexName, value, this.indexes, this.indexConfigs);
  }

  /**
   * Lookup with multiple values (OR operation)
   */
  lookupMultiple(indexName: string, values: any[]): Set<string> {
    return this.queryService.lookupMultiple(indexName, values, this.indexes, this.indexConfigs);
  }

  /**
   * Range query on index (for ordered values)
   */
  lookupRange(
    indexName: string,
    min?: any,
    max?: any,
    inclusive: boolean = true
  ): Set<string> {
    return this.queryService.lookupRange(indexName, min, max, inclusive, this.indexes);
  }

  /**
   * Intersect multiple index lookups (AND operation)
   */
  intersect(...itemSets: Set<string>[]): Set<string> {
    return this.queryService.intersect(...itemSets);
  }

  /**
   * Union multiple index lookups (OR operation)
   */
  union(...itemSets: Set<string>[]): Set<string> {
    return this.queryService.union(...itemSets);
  }

  /**
   * Difference between sets (A - B)
   */
  difference(setA: Set<string>, setB: Set<string>): Set<string> {
    return this.queryService.difference(setA, setB);
  }

  /**
   * Get items by IDs
   */
  getItems(itemIds: Set<string>): T[] {
    return this.queryService.getItems(itemIds, this.itemStore);
  }

  /**
   * Check if index exists
   */
  hasIndex(indexName: string): boolean {
    return this.indexes.has(indexName);
  }

  /**
   * Get all index names
   */
  getIndexNames(): string[] {
    return Array.from(this.indexes.keys());
  }

  /**
   * Get index statistics
   */
  getStatistics(indexName: string): IndexStatistics | undefined {
    return this.statistics.get(indexName);
  }

  /**
   * Clear specific index
   */
  clearIndex(indexName: string): void {
    const index = this.indexes.get(indexName);
    if (index) {
      index.clear();
    }
  }

  /**
   * Clear all indexes
   */
  clearAllIndexes(): void {
    this.indexes.forEach(index => index.clear());
    this.itemStore.clear();
    this.statistics.clear();
  }

  /**
   * Drop an index
   */
  dropIndex(indexName: string): void {
    this.indexes.delete(indexName);
    this.indexConfigs.delete(indexName);
    this.statistics.delete(indexName);
  }
}
