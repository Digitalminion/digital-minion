/**
 * Modern Repository Service
 *
 * Handles all CRUD operations using DataLayer for advanced features
 * (partitioning, caching, map-reduce).
 */

import { DataLayer } from '../../layer/data.layer';
import { Query, QueryResult, FilterCriteria } from '../../layer/data.types';

export class ModernRepositoryService<T extends { id: string }> {
  private dataLayer: DataLayer<T>;

  constructor(dataLayer: DataLayer<T>) {
    this.dataLayer = dataLayer;
  }

  async findAll(criteria?: FilterCriteria<T>): Promise<T[]> {
    const result = await this.dataLayer.query({
      filters: criteria
    });
    return result.data;
  }

  async find(query: Partial<Query<T>>): Promise<QueryResult<T>> {
    return this.dataLayer.query(query as Query<T>);
  }

  async findById(id: string): Promise<T | undefined> {
    const result = await this.dataLayer.query({
      filters: { id } as FilterCriteria<T>
    });
    return result.data[0];
  }

  async findOne(criteria: FilterCriteria<T>): Promise<T | undefined> {
    const result = await this.dataLayer.query({
      filters: criteria,
      limit: 1
    });
    return result.data[0];
  }

  async create(items: T[]): Promise<T[]> {
    await this.dataLayer.insert(items);
    return items;
  }

  async update(criteria: FilterCriteria<T>, updates: Partial<T>): Promise<number> {
    return this.dataLayer.update(criteria, updates);
  }

  async updateById(id: string, updates: Partial<T>): Promise<T | undefined> {
    const count = await this.dataLayer.update(
      { id } as FilterCriteria<T>,
      updates
    );

    if (count === 0) {
      return undefined;
    }

    return this.findById(id);
  }

  async delete(criteria: FilterCriteria<T>): Promise<number> {
    return this.dataLayer.delete(criteria);
  }

  async deleteById(id: string): Promise<boolean> {
    const count = await this.dataLayer.delete({ id } as FilterCriteria<T>);
    return count > 0;
  }

  async count(criteria?: FilterCriteria<T>): Promise<number> {
    return this.dataLayer.count(criteria);
  }

  async exists(criteria: FilterCriteria<T>): Promise<boolean> {
    const count = await this.count(criteria);
    return count > 0;
  }

  async clear(): Promise<void> {
    const all = await this.findAll();
    if (all.length > 0) {
      await this.dataLayer.delete({} as FilterCriteria<T>);
    }
  }

  async disconnect(): Promise<void> {
    await this.dataLayer.disconnect();
  }
}
