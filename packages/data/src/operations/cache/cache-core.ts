/**
 * Core Cache Storage
 *
 * Provides fundamental cache operations without eviction strategy concerns.
 * This is the data structure layer - simple Map operations with TTL support.
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  hits: number;
  ttl?: number;
  size?: number;
}

/**
 * Core cache storage operations
 */
export class CacheCore<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;
  private enabled: boolean;

  constructor(defaultTTL: number = 5 * 60 * 1000, enabled: boolean = true) {
    this.defaultTTL = defaultTTL;
    this.enabled = enabled;
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    if (!this.enabled) {
      return undefined;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check TTL expiration
    const age = Date.now() - entry.timestamp;
    const ttl = entry.ttl || this.defaultTTL;

    if (age > ttl) {
      this.delete(key);
      return undefined;
    }

    // Update hit tracking
    entry.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    if (!this.enabled) {
      return;
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      hits: 0,
      ttl,
      size: this.estimateSize(value)
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    if (!this.enabled) {
      return false;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check TTL
    const age = Date.now() - entry.timestamp;
    const ttl = entry.ttl || this.defaultTTL;

    if (age > ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache entries (for internal use by eviction strategies)
   */
  getEntries(): Map<string, CacheEntry<T>> {
    return this.cache;
  }

  /**
   * Get entry by key (for internal use)
   */
  getEntry(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key);
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16 encoding
    } catch {
      return 1024; // Default 1KB estimate for non-serializable objects
    }
  }

  /**
   * Get total memory usage estimate
   */
  getMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size || 1024;
    }
    return total;
  }

  /**
   * Get oldest and newest entry timestamps
   */
  getTimestampRange(): { oldest?: number; newest?: number } {
    let oldest: number | undefined;
    let newest: number | undefined;

    for (const entry of this.cache.values()) {
      if (!oldest || entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
      if (!newest || entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }

    return { oldest, newest };
  }

  /**
   * Clean expired entries
   * Returns count of removed entries
   */
  cleanExpired(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      const ttl = entry.ttl || this.defaultTTL;

      if (age > ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}
