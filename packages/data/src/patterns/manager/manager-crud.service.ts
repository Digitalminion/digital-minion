/**
 * Manager CRUD Service
 *
 * Handles all CRUD operations by delegating to the repository layer.
 * Provides a clean separation between business logic (in BaseManager)
 * and data access (in Repository).
 */

import { BaseRepository } from '../base.repository';
import { FilterCriteria, QueryResult, Query } from '../../layer/data.types';
import { DataLayer } from '../../layer/data.layer';

/**
 * Service for CRUD operations
 */
export class ManagerCrudService<T extends { id: string }> {
  private repository: BaseRepository<T>;
  private dataLayer?: DataLayer<T>;

  constructor(repository: BaseRepository<T>, dataLayer?: DataLayer<T>) {
    this.repository = repository;
    this.dataLayer = dataLayer;
  }

  /**
   * Get all items across all namespaces
   */
  async getAllItems(): Promise<T[]> {
    return this.repository.findAll();
  }

  /**
   * Get items by namespace/partition
   */
  async getItemsByNamespace(namespace: string): Promise<T[]> {
    if (this.dataLayer) {
      const result = await this.dataLayer.query({
        partitions: [namespace]
      });
      return result.data;
    }

    // Fallback to repository
    return this.repository.findAll();
  }

  /**
   * Get item by ID
   */
  async getItemById(id: string): Promise<T | undefined> {
    return this.repository.findById(id);
  }

  /**
   * Search items with advanced criteria
   */
  async search(criteria: FilterCriteria<T>): Promise<T[]> {
    return this.repository.findAll(criteria);
  }

  /**
   * Query items with pagination and sorting
   */
  async query(query: Partial<Query<T>>): Promise<QueryResult<T>> {
    return this.repository.find(query);
  }

  /**
   * Create single item (no validation or hooks - handled by caller)
   */
  async createItem(item: T): Promise<T> {
    const created = await this.repository.create(item);

    if (!created || created.length === 0) {
      throw new Error('Failed to create item');
    }

    return created[0]!;
  }

  /**
   * Create multiple items (no validation or hooks - handled by caller)
   */
  async createItems(items: T[]): Promise<T[]> {
    return this.repository.create(items);
  }

  /**
   * Update item by ID
   */
  async updateItem(id: string, updates: Partial<T>): Promise<T | undefined> {
    return this.repository.updateById(id, updates);
  }

  /**
   * Update multiple items matching criteria
   */
  async updateItems(criteria: FilterCriteria<T>, updates: Partial<T>): Promise<number> {
    return this.repository.update(criteria, updates);
  }

  /**
   * Delete item by ID
   */
  async deleteItem(id: string): Promise<boolean> {
    return this.repository.deleteById(id);
  }

  /**
   * Delete items matching criteria
   */
  async deleteItems(criteria: FilterCriteria<T>): Promise<number> {
    return this.repository.delete(criteria);
  }

  /**
   * Count items matching criteria
   */
  async count(criteria?: FilterCriteria<T>): Promise<number> {
    return this.repository.count(criteria);
  }

  /**
   * Check if item exists
   */
  async exists(criteria: FilterCriteria<T>): Promise<boolean> {
    return this.repository.exists(criteria);
  }

  /**
   * Clear all data (use with caution!)
   */
  async clear(): Promise<void> {
    await this.repository.clear();
  }
}
