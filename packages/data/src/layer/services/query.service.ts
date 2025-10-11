/**
 * Query Service
 *
 * Handles all read/query operations with caching, filtering, sorting, and pagination.
 */

import { MapReduceEngine } from '../../operations/mapreduce/mapreduce.engine';
import { CacheManager } from '../../operations/cache/cache.manager';
import { FilterComposer } from '../../operations/filter/filter.composer';
import { RetryManager } from '../../operations/retry/retry.manager';
import { Query, QueryResult, Partition, SortCriteria } from '../data.types';

export class QueryService<T = any> {
  private mapReduceEngine: MapReduceEngine<T, any>;
  private cacheManager: CacheManager<T[]>;
  private filterComposer: FilterComposer<T>;
  private retryManager: RetryManager;
  private enableCaching: boolean;

  constructor(
    mapReduceEngine: MapReduceEngine<T, any>,
    cacheManager: CacheManager<T[]>,
    filterComposer: FilterComposer<T>,
    retryManager: RetryManager,
    enableCaching: boolean = true
  ) {
    this.mapReduceEngine = mapReduceEngine;
    this.cacheManager = cacheManager;
    this.filterComposer = filterComposer;
    this.retryManager = retryManager;
    this.enableCaching = enableCaching;
  }

  /**
   * Execute query with filters, sorting, and pagination
   */
  async query(query: Query<T>, partitions: Partition<T>[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query);

    // Check cache
    if (this.enableCaching) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        return {
          data: cached,
          metadata: {
            totalCount: cached.length,
            returnedCount: cached.length,
            partitionsQueried: [],
            executionTime: Date.now() - startTime,
            cacheHit: true
          }
        };
      }
    }

    // Execute query with retry
    const result = await this.retryManager.execute(async () => {
      const queryResults = await this.mapReduceEngine.execute(
        partitions,
        {
          map: (item) => {
            if (query.filters && !this.filterComposer.matches(item, query.filters)) {
              return [];
            }
            return [['result', item]];
          },
          reduce: (key, items) => items
        }
      );

      // MapReduceResult.results is an array of reduce results (each reduce returns an array)
      // Flatten to get all items in a single array
      return queryResults.results.flat() || [];
    }, 'query');

    if (!result.success) {
      throw result.error || new Error('Query failed');
    }

    let data = result.value || [];

    // Apply sorting
    if (query.sort) {
      data = this.sortData(data, query.sort);
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit;
    const totalCount = data.length;

    if (limit !== undefined) {
      data = data.slice(offset, offset + limit);
    }

    // Cache results
    if (this.enableCaching) {
      this.cacheManager.set(cacheKey, data);
    }

    return {
      data,
      metadata: {
        totalCount,
        returnedCount: data.length,
        partitionsQueried: partitions.map(p => p.id),
        executionTime: Date.now() - startTime,
        cacheHit: false
      }
    };
  }

  /**
   * Count items matching filter
   */
  async count(data: T[], filter?: any): Promise<number> {
    if (!filter) return data.length;

    return data.filter(item => this.filterComposer.matches(item, filter)).length;
  }

  /**
   * Sort data by criteria
   */
  private sortData(data: T[], sort: SortCriteria<T>): T[] {
    const sorted = [...data];

    sorted.sort((a, b) => {
      const field = String(sort.field);
      const direction = sort.direction === 'asc' ? 1 : -1;
      const aVal = this.getFieldValue(a, field);
      const bVal = this.getFieldValue(b, field);

      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });

    return sorted;
  }

  /**
   * Get nested field value
   */
  private getFieldValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  /**
   * Generate cache key from query
   */
  private generateCacheKey(query: Query<T>): string {
    return JSON.stringify({
      partitions: query.partitions,
      filters: query.filters,
      sort: query.sort,
      offset: query.offset,
      limit: query.limit
    });
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.cacheManager.clear();
  }
}
