/**
 * Cache Module Exports
 *
 * Provides a clean interface for cache functionality.
 */

// Main cache manager
export { CacheManager } from './cache.manager';
export type { CacheStatistics } from './cache.manager';

// Core types
export { CacheCore } from './cache-core';
export type { CacheEntry } from './cache-core';

// Eviction strategies
export {
  LRUEviction,
  LFUEviction,
  FIFOEviction,
  EvictionStrategyFactory
} from './eviction-strategies';
export type {
  EvictionStrategy,
  IEvictionStrategy
} from './eviction-strategies';
