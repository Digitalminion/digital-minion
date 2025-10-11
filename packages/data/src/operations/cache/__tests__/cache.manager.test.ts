/**
 * Tests for CacheManager
 */

import { CacheManager } from '../cache.manager';

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for missing keys', () => {
      expect(cache.has('missing')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should handle deleting non-existent keys', () => {
      expect(() => cache.delete('missing')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return number of entries', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.size()).toBe(1);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', (done) => {
      const shortTTLCache = new CacheManager<string>({ ttl: 50 }); // 50ms TTL

      shortTTLCache.set('key1', 'value1');
      expect(shortTTLCache.get('key1')).toBe('value1');

      setTimeout(() => {
        expect(shortTTLCache.get('key1')).toBeUndefined();
        done();
      }, 100);
    });

    it('should support custom TTL per entry', (done) => {
      cache.set('key1', 'value1', 50); // TTL is 3rd param, not an object

      setTimeout(() => {
        expect(cache.get('key1')).toBeUndefined();
        done();
      }, 100);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used items when full', () => {
      const lruCache = new CacheManager<string>({ maxSize: 3, strategy: 'lru' });

      lruCache.set('key1', 'value1');
      lruCache.set('key2', 'value2');
      lruCache.set('key3', 'value3');

      // Access key1 to make it recently used
      lruCache.get('key1');

      // Add key4, should evict key2 (least recently used)
      lruCache.set('key4', 'value4');

      expect(lruCache.has('key1')).toBe(true);
      expect(lruCache.has('key2')).toBe(false); // Evicted
      expect(lruCache.has('key3')).toBe(true);
      expect(lruCache.has('key4')).toBe(true);
    });
  });

  describe('FIFO eviction', () => {
    it('should evict first in items when full', () => {
      const fifoCache = new CacheManager<string>({ maxSize: 3, strategy: 'fifo' });

      fifoCache.set('key1', 'value1');
      fifoCache.set('key2', 'value2');
      fifoCache.set('key3', 'value3');
      fifoCache.set('key4', 'value4');

      // key1 should be evicted (first in)
      expect(fifoCache.has('key1')).toBe(false);
      expect(fifoCache.has('key2')).toBe(true);
      expect(fifoCache.has('key3')).toBe(true);
      expect(fifoCache.has('key4')).toBe(true);
    });
  });

  describe('LFU eviction', () => {
    it('should evict least frequently used items when full', () => {
      const lfuCache = new CacheManager<string>({ maxSize: 3, strategy: 'lfu' });

      lfuCache.set('key1', 'value1');
      lfuCache.set('key2', 'value2');
      lfuCache.set('key3', 'value3');

      // Access key1 and key3 multiple times
      lfuCache.get('key1');
      lfuCache.get('key1');
      lfuCache.get('key3');

      // Add key4, should evict key2 (least frequently used)
      lfuCache.set('key4', 'value4');

      expect(lfuCache.has('key1')).toBe(true);
      expect(lfuCache.has('key2')).toBe(false); // Evicted
      expect(lfuCache.has('key3')).toBe(true);
      expect(lfuCache.has('key4')).toBe(true);
    });
  });

  describe('disabled cache', () => {
    it('should not cache when disabled', () => {
      const disabledCache = new CacheManager<string>({ enabled: false });

      disabledCache.set('key1', 'value1');
      expect(disabledCache.get('key1')).toBeUndefined();
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });
  });

  describe('invalidation rules', () => {
    it('should support TTL-based invalidation', () => {
      const ttlCache = new CacheManager<string>({ ttl: 1000 });
      ttlCache.set('key1', 'value1');

      expect(ttlCache.has('key1')).toBe(true);
    });

    it('should invalidate keys matching patterns', () => {
      cache.set('user:1', 'data1');
      cache.set('user:2', 'data2');
      cache.set('post:1', 'post1');

      const count = cache.invalidate([{ patterns: ['^user:'] }]);

      expect(count).toBe(2);
      expect(cache.has('user:1')).toBe(false);
      expect(cache.has('user:2')).toBe(false);
      expect(cache.has('post:1')).toBe(true);
    });

    it('should invalidate multiple patterns', () => {
      cache.set('user:1', 'data1');
      cache.set('post:1', 'post1');
      cache.set('comment:1', 'comment1');

      const count = cache.invalidate([
        { patterns: ['^user:', '^post:'] }
      ]);

      expect(count).toBe(2);
      expect(cache.has('comment:1')).toBe(true);
    });
  });

  describe('cleanExpired', () => {
    it('should remove expired entries', (done) => {
      const ttlCache = new CacheManager<string>({ ttl: 50 });

      ttlCache.set('key1', 'value1');
      ttlCache.set('key2', 'value2');

      setTimeout(() => {
        const cleaned = ttlCache.cleanExpired();

        expect(cleaned).toBe(2);
        expect(ttlCache.size()).toBe(0);
        done();
      }, 100);
    });

    it('should not remove non-expired entries', () => {
      const ttlCache = new CacheManager<string>({ ttl: 10000 });

      ttlCache.set('key1', 'value1');
      const cleaned = ttlCache.cleanExpired();

      expect(cleaned).toBe(0);
      expect(ttlCache.has('key1')).toBe(true);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cache.set('key1', 'cached');

      const factory = jest.fn().mockResolvedValue('new');
      const result = await cache.getOrSet('key1', factory);

      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory if value not cached', async () => {
      const factory = jest.fn().mockResolvedValue('new-value');
      const result = await cache.getOrSet('key1', factory);

      expect(result).toBe('new-value');
      expect(factory).toHaveBeenCalled();
      expect(cache.get('key1')).toBe('new-value');
    });

    it('should support custom TTL', async () => {
      const factory = jest.fn().mockResolvedValue('value');
      await cache.getOrSet('key1', factory, 100);

      const entry = (cache as any).core.getEntry('key1');
      expect(entry.ttl).toBe(100);
    });
  });

  describe('mget', () => {
    beforeEach(() => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
    });

    it('should get multiple keys', () => {
      const results = cache.mget(['key1', 'key2']);

      expect(results.size).toBe(2);
      expect(results.get('key1')).toBe('value1');
      expect(results.get('key2')).toBe('value2');
    });

    it('should skip missing keys', () => {
      const results = cache.mget(['key1', 'missing', 'key2']);

      expect(results.size).toBe(2);
      expect(results.has('missing')).toBe(false);
    });

    it('should return empty map for no keys', () => {
      const results = cache.mget([]);
      expect(results.size).toBe(0);
    });
  });

  describe('mset', () => {
    it('should set multiple keys', () => {
      const entries = new Map<string, string>([
        ['key1', 'value1'],
        ['key2', 'value2']
      ]);

      cache.mset(entries);

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });

    it('should support custom TTL', () => {
      const entries = new Map<string, string>([['key1', 'value1']]);
      cache.mset(entries, 100);

      const entry = (cache as any).core.getEntry('key1');
      expect(entry.ttl).toBe(100);
    });
  });

  describe('getStatistics', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('missing'); // Miss

      const stats = cache.getStatistics();

      expect(stats.totalEntries).toBe(1);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('missing'); // Miss

      const stats = cache.getStatistics();
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('updateConfig and getConfig', () => {
    it('should update configuration', () => {
      cache.updateConfig({ maxSize: 500, strategy: 'fifo' });

      const config = cache.getConfig();
      expect(config.maxSize).toBe(500);
      expect(config.strategy).toBe('fifo');
    });

    it('should preserve other config values', () => {
      const originalTTL = cache.getConfig().ttl;
      cache.updateConfig({ maxSize: 500 });

      const config = cache.getConfig();
      expect(config.ttl).toBe(originalTTL);
    });
  });

  describe('edge cases', () => {
    it('should handle eviction when accessOrder is empty (LRU fallback)', () => {
      const lruCache = new CacheManager<string>({ maxSize: 2, strategy: 'lru' });

      // Manually set without going through normal flow
      (lruCache as any).core.getEntries().set('key1', {
        key: 'key1',
        value: 'value1',
        timestamp: Date.now(),
        hits: 0
      });
      (lruCache as any).core.getEntries().set('key2', {
        key: 'key2',
        value: 'value2',
        timestamp: Date.now(),
        hits: 0
      });

      // Clear access order to test fallback
      (lruCache as any).evictionStrategy.accessOrder = [];

      // This should trigger eviction with fallback
      lruCache.set('key3', 'value3');

      expect(lruCache.size()).toBe(2);
    });

    it('should handle eviction when insertionOrder is empty (FIFO fallback)', () => {
      const fifoCache = new CacheManager<string>({ maxSize: 2, strategy: 'fifo' });

      // Manually set without going through normal flow
      (fifoCache as any).core.getEntries().set('key1', {
        key: 'key1',
        value: 'value1',
        timestamp: Date.now(),
        hits: 0
      });
      (fifoCache as any).core.getEntries().set('key2', {
        key: 'key2',
        value: 'value2',
        timestamp: Date.now(),
        hits: 0
      });

      // Clear insertion order to test fallback
      (fifoCache as any).evictionStrategy.insertionOrder = [];

      // This should trigger eviction with fallback
      fifoCache.set('key3', 'value3');

      expect(fifoCache.size()).toBe(2);
    });

    it('should handle non-serializable values in size estimation', () => {
      const circular: any = {};
      circular.self = circular;

      cache.set('circular', circular);

      const stats = cache.getStatistics();
      expect(stats.memoryUsage).toBe(1024); // Default 1KB
    });

    it('should handle TTL expiration in has()', (done) => {
      const ttlCache = new CacheManager<string>({ ttl: 50 });
      ttlCache.set('key1', 'value1');

      setTimeout(() => {
        expect(ttlCache.has('key1')).toBe(false);
        done();
      }, 100);
    });
  });
});
