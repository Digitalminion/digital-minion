/**
 * Index Statistics Service
 *
 * Calculates and tracks index statistics.
 */

import { IndexStatistics } from '../index.types';

export class IndexStatsService {
  /**
   * Calculate statistics for an index
   */
  calculateStatistics(
    indexName: string,
    index: Map<any, Set<string>>,
    buildTime: number
  ): IndexStatistics {
    let totalItems = 0;
    for (const itemIds of index.values()) {
      totalItems += itemIds.size;
    }

    return {
      totalKeys: index.size,
      totalItems,
      averageItemsPerKey: index.size > 0 ? totalItems / index.size : 0,
      buildTime,
      memoryUsage: this.estimateMemoryUsage(index)
    };
  }

  /**
   * Estimate memory usage of index
   */
  private estimateMemoryUsage(index: Map<any, Set<string>>): number {
    let size = 0;

    for (const [key, itemIds] of index.entries()) {
      // Estimate key size
      size += typeof key === 'string' ? key.length * 2 : 8;

      // Estimate set size (string IDs)
      for (const id of itemIds) {
        size += id.length * 2;
      }
    }

    return size;
  }
}
