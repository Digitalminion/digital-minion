/**
 * Cache Manager - Orchestration Layer
 *
 * High-level cache operations coordinating CacheCore and EvictionStrategies.
 * Provides statistics, batch operations, and invalidation rules.
 *
 * This is the REFACTORED version - delegates to focused services:
 * - CacheCore: Storage and basic operations
 * - EvictionStrategies: LRU/LFU/FIFO logic
 */

import { CacheConfig, CacheInvalidationRule } from '../../layer/data.types';
import { CacheCore, CacheEntry } from './cache-core';
import { EvictionStrategyFactory, IEvictionStrategy, EvictionStrategy } from './eviction-strategies';

// Re-export for backward compatibility
export type { CacheEntry } from './cache-core';

export interface CacheStatistics {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry?: number;
  newestEntry?: number;
}

/**
 * Cache Manager - High-level orchestration
 */
export class CacheManager<T = any> {
  private core: CacheCore<T>;
  private evictionStrategy: IEvictionStrategy;
  private config: CacheConfig;
  private statistics: CacheStatistics;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      strategy: 'lru',
      ...config
    };

    // Initialize core storage
    this.core = new CacheCore<T>(this.config.ttl, this.config.enabled);

    // Initialize eviction strategy
    this.evictionStrategy = EvictionStrategyFactory.create(
      this.config.strategy as EvictionStrategy
    );

    // Initialize statistics
    this.statistics = {
      totalEntries: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      memoryUsage: 0
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const value = this.core.get(key);

    if (value === undefined) {
      this.statistics.totalMisses++;
      this.updateHitRate();
      return undefined;
    }

    this.statistics.totalHits++;
    this.updateHitRate();

    // Notify eviction strategy of access
    this.evictionStrategy.onAccess(key);

    return value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Check if we need to evict
    if (this.core.size() >= this.config.maxSize) {
      this.evict();
    }

    this.core.set(key, value, ttl);

    // Notify eviction strategy
    this.evictionStrategy.onAdd(key);

    this.statistics.totalEntries = this.core.size();
    this.updateMemoryUsage();
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const exists = this.core.has(key);

    if (exists) {
      // Notify eviction strategy of access
      this.evictionStrategy.onAccess(key);
    }

    return exists;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const deleted = this.core.delete(key);

    if (deleted) {
      this.evictionStrategy.onRemove(key);
      this.statistics.totalEntries = this.core.size();
      this.updateMemoryUsage();
    }

    return deleted;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.core.clear();
    this.evictionStrategy.clear();

    this.statistics.totalEntries = 0;
    this.statistics.totalHits = 0;
    this.statistics.totalMisses = 0;
    this.statistics.hitRate = 0;
    this.statistics.memoryUsage = 0;
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return this.core.keys();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.core.size();
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    const { oldest, newest } = this.core.getTimestampRange();
    return {
      ...this.statistics,
      oldestEntry: oldest,
      newestEntry: newest
    };
  }

  /**
   * Invalidate cache based on rules
   */
  invalidate(rules: CacheInvalidationRule[]): number {
    let invalidatedCount = 0;

    for (const rule of rules) {
      if (rule.patterns) {
        for (const pattern of rule.patterns) {
          const regex = new RegExp(pattern);

          for (const key of this.core.keys()) {
            if (regex.test(key)) {
              this.delete(key);
              invalidatedCount++;
            }
          }
        }
      }
    }

    return invalidatedCount;
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const cleaned = this.core.cleanExpired();
    this.statistics.totalEntries = this.core.size();
    this.updateMemoryUsage();
    return cleaned;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Batch get multiple keys
   */
  mget(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();

    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Batch set multiple keys
   */
  mset(entries: Map<string, T>, ttl?: number): void {
    for (const [key, value] of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.enabled !== undefined) {
      this.core.setEnabled(config.enabled);
    }

    if (config.ttl !== undefined) {
      this.core.setDefaultTTL(config.ttl);
    }

    if (config.strategy) {
      // Replace eviction strategy
      this.evictionStrategy.clear();
      this.evictionStrategy = EvictionStrategyFactory.create(
        config.strategy as EvictionStrategy
      );
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Evict one entry based on strategy
   */
  private evict(): void {
    const entries = this.core.getEntries();
    const victimKey = this.evictionStrategy.selectVictim(entries);

    if (victimKey) {
      this.delete(victimKey);
    }
  }

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.statistics.totalHits + this.statistics.totalMisses;
    this.statistics.hitRate = total > 0 ? this.statistics.totalHits / total : 0;
  }

  /**
   * Update memory usage estimate
   */
  private updateMemoryUsage(): void {
    this.statistics.memoryUsage = this.core.getMemoryUsage();
  }
}
