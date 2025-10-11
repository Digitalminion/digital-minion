/**
 * Manager Statistics Service
 *
 * Tracks and manages statistics for the manager, including item counts,
 * namespace distribution, and last update timestamps.
 */

import { DataLayer } from '../../layer/data.layer';
import { ManagerCrudService } from './manager-crud.service';

export interface BaseManagerStats {
  totalItems: number;
  itemsByNamespace: Record<string, number>;
  itemsByStatus?: Record<string, number>;
  lastUpdated: string;
}

/**
 * Service for managing statistics
 */
export class ManagerStatsService<T extends { id: string }> {
  private stats: BaseManagerStats;
  private crudService: ManagerCrudService<T>;
  private dataLayer?: DataLayer<T>;
  private dateProvider: () => Date;
  private saveStatsCallback?: () => Promise<void>;

  constructor(
    crudService: ManagerCrudService<T>,
    dataLayer?: DataLayer<T>,
    dateProvider?: () => Date
  ) {
    this.crudService = crudService;
    this.dataLayer = dataLayer;
    this.dateProvider = dateProvider || (() => new Date());

    this.stats = {
      totalItems: 0,
      itemsByNamespace: {},
      lastUpdated: this.dateProvider().toISOString()
    };
  }

  /**
   * Set callback for saving stats (allows subclass to persist)
   */
  setSaveStatsCallback(callback: () => Promise<void>): void {
    this.saveStatsCallback = callback;
  }

  /**
   * Get current statistics
   */
  getStats(): BaseManagerStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  async updateStats(): Promise<void> {
    this.stats.totalItems = await this.crudService.count();
    this.stats.lastUpdated = this.dateProvider().toISOString();

    // Update namespace counts if DataLayer is available
    if (this.dataLayer) {
      try {
        const dataLayerStats = await this.dataLayer.getStatistics();
        this.stats.itemsByNamespace = {};

        // DataLayer stats structure doesn't have partitionStatistics, just totalPartitions
        // This would need to be enhanced if per-partition counts are needed
      } catch (error) {
        // Ignore stats errors
      }
    }

    await this.saveStats();
  }

  /**
   * Save statistics (calls callback if set)
   */
  private async saveStats(): Promise<void> {
    if (this.saveStatsCallback) {
      await this.saveStatsCallback();
    }
  }

  /**
   * Set stats directly (useful for loading from persistence)
   */
  setStats(stats: BaseManagerStats): void {
    this.stats = { ...stats };
  }

  /**
   * Reset stats to initial state
   */
  resetStats(): void {
    this.stats = {
      totalItems: 0,
      itemsByNamespace: {},
      lastUpdated: this.dateProvider().toISOString()
    };
  }
}
