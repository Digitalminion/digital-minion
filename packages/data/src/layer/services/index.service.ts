/**
 * Index Service
 *
 * Manages indexes for fast lookups and queries.
 */

import { IndexManager } from '../../operations/index/index.manager';
import { IndexConfig } from '../../operations/index/index.types';

export interface IndexOptions {
  unique?: boolean;
  caseSensitive?: boolean;
}

export class IndexService<T = any> {
  private indexManager: IndexManager<T>;

  constructor(indexManager: IndexManager<T>) {
    this.indexManager = indexManager;
  }

  /**
   * Create index on fields
   */
  async createIndex(
    indexName: string,
    fields: string[],
    data: T[],
    options?: IndexOptions
  ): Promise<void> {
    const config: IndexConfig = {
      fields,
      unique: options?.unique || false
    };

    this.indexManager.createIndex(indexName, config);

    // Build index with data
    this.indexManager.buildIndex(indexName, data, (item) => this.getItemId(item));
  }

  /**
   * Query using index
   */
  async queryWithIndex(indexName: string, value: any, allData: T[]): Promise<T[]> {
    const ids = this.indexManager.lookup(indexName, value);
    return this.indexManager.getItems(ids);
  }

  /**
   * Add item to index (rebuild required)
   */
  addToIndex(indexName: string, item: T, allData: T[]): void {
    // Rebuild index with new data
    this.indexManager.buildIndex(indexName, allData, (item) => this.getItemId(item));
  }

  /**
   * Remove item from index
   */
  removeFromIndex(indexName: string, itemId: string): void {
    this.indexManager.removeItem(itemId);
  }

  /**
   * Update item in index (rebuild required)
   */
  updateInIndex(indexName: string, allData: T[]): void {
    // Rebuild index with updated data
    this.indexManager.buildIndex(indexName, allData, (item) => this.getItemId(item));
  }

  /**
   * Drop index
   */
  dropIndex(indexName: string): void {
    this.indexManager.dropIndex(indexName);
  }

  /**
   * List all indexes
   */
  listIndexes(): string[] {
    return this.indexManager.getIndexNames();
  }

  /**
   * Get item ID (assumes 'id' field or string coercion)
   */
  private getItemId(item: T): string {
    if (typeof item === 'object' && item !== null) {
      return (item as any).id || String(item);
    }
    return String(item);
  }
}
