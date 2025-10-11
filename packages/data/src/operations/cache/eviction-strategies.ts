/**
 * Cache Eviction Strategies
 *
 * Implements different eviction algorithms:
 * - LRU (Least Recently Used)
 * - LFU (Least Frequently Used)
 * - FIFO (First In First Out)
 */

import { CacheEntry } from './cache-core';

export type EvictionStrategy = 'lru' | 'lfu' | 'fifo';

/**
 * Base interface for eviction strategies
 */
export interface IEvictionStrategy {
  /**
   * Called when an item is accessed (for LRU tracking)
   */
  onAccess(key: string): void;

  /**
   * Called when an item is added
   */
  onAdd(key: string): void;

  /**
   * Called when an item is removed
   */
  onRemove(key: string): void;

  /**
   * Select a key to evict
   * Returns the key that should be removed
   */
  selectVictim<T>(entries: Map<string, CacheEntry<T>>): string | null;

  /**
   * Clear all tracking data
   */
  clear(): void;
}

/**
 * LRU (Least Recently Used) Eviction Strategy
 */
export class LRUEviction implements IEvictionStrategy {
  private accessOrder: string[] = [];

  onAccess(key: string): void {
    // Move to end (most recently used)
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  onAdd(key: string): void {
    this.accessOrder.push(key);
  }

  onRemove(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  selectVictim<T>(entries: Map<string, CacheEntry<T>>): string | null {
    // Return least recently used (first in order)
    if (this.accessOrder.length === 0) {
      // Fallback: return any key if accessOrder is empty
      const keys = Array.from(entries.keys());
      return keys.length > 0 ? (keys[0] ?? null) : null;
    }
    return this.accessOrder[0] ?? null;
  }

  clear(): void {
    this.accessOrder = [];
  }
}

/**
 * LFU (Least Frequently Used) Eviction Strategy
 */
export class LFUEviction implements IEvictionStrategy {
  onAccess(key: string): void {
    // Hits are tracked in CacheEntry, nothing to do here
  }

  onAdd(key: string): void {
    // Nothing to track
  }

  onRemove(key: string): void {
    // Nothing to clean up
  }

  selectVictim<T>(entries: Map<string, CacheEntry<T>>): string | null {
    let minHits = Infinity;
    let victim: string | null = null;

    for (const [key, entry] of entries) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        victim = key;
      }
    }

    return victim;
  }

  clear(): void {
    // Nothing to clear
  }
}

/**
 * FIFO (First In First Out) Eviction Strategy
 */
export class FIFOEviction implements IEvictionStrategy {
  private insertionOrder: string[] = [];

  onAccess(key: string): void {
    // FIFO doesn't care about access
  }

  onAdd(key: string): void {
    this.insertionOrder.push(key);
  }

  onRemove(key: string): void {
    const index = this.insertionOrder.indexOf(key);
    if (index !== -1) {
      this.insertionOrder.splice(index, 1);
    }
  }

  selectVictim<T>(entries: Map<string, CacheEntry<T>>): string | null {
    // Return first inserted (first in order)
    if (this.insertionOrder.length === 0) {
      // Fallback: return oldest by timestamp
      let oldest: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of entries) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldest = key;
        }
      }

      return oldest;
    }

    return this.insertionOrder[0] ?? null;
  }

  clear(): void {
    this.insertionOrder = [];
  }
}

/**
 * Factory for creating eviction strategies
 */
export class EvictionStrategyFactory {
  static create(strategy: EvictionStrategy): IEvictionStrategy {
    switch (strategy) {
      case 'lru':
        return new LRUEviction();
      case 'lfu':
        return new LFUEviction();
      case 'fifo':
        return new FIFOEviction();
      default:
        throw new Error(`Unknown eviction strategy: ${strategy}`);
    }
  }
}
