/**
 * BaseRepository - Refactored with Service Delegation
 *
 * Clean facade over specialized services:
 * - ModernRepositoryService: DataLayer-based operations
 * - RepositoryStatsService: Statistics tracking
 */

import { DataLayer } from '../layer/data.layer';
import { Query, QueryResult, FilterCriteria } from '../layer/data.types';
import { ModernRepositoryService } from './repository/modern.repository';
import { RepositoryStatsService, RepositoryStats } from './repository/stats.service';

export interface BaseRepositoryConfig {
  basePath: string;
  collection: string;
  namespace?: string;
  fileType?: 'json' | 'jsonl';
}

/**
 * Generic base repository with service delegation
 */
export abstract class BaseRepository<T extends { id: string }> {
  protected config: BaseRepositoryConfig;
  protected dataLayer: DataLayer<T>;

  // Services
  private repositoryService: ModernRepositoryService<T>;
  private statsService: RepositoryStatsService;

  constructor(config: BaseRepositoryConfig) {
    this.config = {
      fileType: 'jsonl',
      ...config
    };

    this.dataLayer = new DataLayer<T>({
      basePath: this.config.basePath,
      collection: this.config.collection,
      adapterType: this.config.fileType,
      enableCaching: true,
      autoDiscoverPartitions: true
    });

    this.repositoryService = new ModernRepositoryService(this.dataLayer);

    this.statsService = new RepositoryStatsService();
    this.statsService.setCallbacks(
      async () => { await this.loadStats(); },
      async () => { await this.saveStats(); }
    );
  }

  /**
   * Initialize repository
   */
  async initialize(): Promise<void> {
    await this.dataLayer.initialize();
    await this.statsService.loadStats();
  }

  // ===== QUERY OPERATIONS =====

  async findAll(criteria?: FilterCriteria<T>): Promise<T[]> {
    return this.repositoryService.findAll(criteria);
  }

  async find(query: Partial<Query<T>>): Promise<QueryResult<T>> {
    return this.repositoryService.find(query);
  }

  async findById(id: string): Promise<T | undefined> {
    return this.repositoryService.findById(id);
  }

  async findOne(criteria: FilterCriteria<T>): Promise<T | undefined> {
    return this.repositoryService.findOne(criteria);
  }

  // ===== WRITE OPERATIONS =====

  async create(items: T | T[]): Promise<T[]> {
    const itemsArray = Array.isArray(items) ? items : [items];

    // Validate all items
    for (const item of itemsArray) {
      const isValid = await this.validate(item);
      if (!isValid) {
        throw new Error(`Validation failed for item: ${JSON.stringify(item)}`);
      }
    }

    const created = await this.repositoryService.create(itemsArray);
    await this.updateStats();
    return created;
  }

  async update(criteria: FilterCriteria<T>, updates: Partial<T>): Promise<number> {
    const count = await this.repositoryService.update(criteria, updates);
    if (count > 0) {
      await this.updateStats();
    }
    return count;
  }

  async updateById(id: string, updates: Partial<T>): Promise<T | undefined> {
    const result = await this.repositoryService.updateById(id, updates);
    if (result) {
      await this.updateStats();
    }
    return result;
  }

  async delete(criteria: FilterCriteria<T>): Promise<number> {
    const count = await this.repositoryService.delete(criteria);
    if (count > 0) {
      await this.updateStats();
    }
    return count;
  }

  async deleteById(id: string): Promise<boolean> {
    const deleted = await this.repositoryService.deleteById(id);
    if (deleted) {
      await this.updateStats();
    }
    return deleted;
  }

  // ===== COUNT & EXISTS =====

  async count(criteria?: FilterCriteria<T>): Promise<number> {
    return this.repositoryService.count(criteria);
  }

  async exists(criteria: FilterCriteria<T>): Promise<boolean> {
    return this.repositoryService.exists(criteria);
  }

  // ===== STATISTICS =====

  async getStats(): Promise<RepositoryStats> {
    return this.statsService.getStats();
  }

  async updateStats(): Promise<void> {
    const total = await this.count();
    await this.statsService.updateStats(total);
  }

  // ===== LIFECYCLE =====

  async clear(): Promise<void> {
    await this.repositoryService.clear();
    await this.updateStats();
  }

  async disconnect(): Promise<void> {
    await this.dataLayer?.disconnect();
  }

  // ===== ABSTRACT METHODS =====

  protected abstract validate(item: T): Promise<boolean>;
  protected abstract getDataPath(): string;
  protected abstract loadStats(): Promise<RepositoryStats | undefined>;
  protected abstract saveStats(): Promise<void>;
}
