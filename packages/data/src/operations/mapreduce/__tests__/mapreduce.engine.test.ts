/**
 * Basic tests for MapReduceEngine
 */

import { MapReduceEngine } from '../mapreduce.engine';
import { JSONLAdapter } from '../../../layer/adapters/jsonl.adapter';
import { Partition } from '../../../layer/data.types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MapReduceEngine', () => {
  let engine: MapReduceEngine;
  let adapter: JSONLAdapter;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `mapreduce-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    adapter = new JSONLAdapter();
    await adapter.connect();

    engine = new MapReduceEngine(adapter);
  });

  afterEach(async () => {
    await adapter.disconnect();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should execute simple map-reduce operation', async () => {
    // Create test partitions
    const p1File = join(testDir, 'p1.jsonl');
    const p2File = join(testDir, 'p2.jsonl');

    await fs.writeFile(p1File, '{"value":1}\n{"value":2}\n', 'utf-8');
    await fs.writeFile(p2File, '{"value":3}\n{"value":4}\n', 'utf-8');

    const partitions: Partition<any>[] = [
      { id: 'p1', location: p1File, filters: {} },
      { id: 'p2', location: p2File, filters: {} }
    ];

    const operation = {
      map: (item: any) => [['sum', item.value]], // Return array of [key, value] tuples
      reduce: (key: string, values: any[]) => {
        const total = values.reduce((sum, v) => sum + v, 0);
        return total;
      }
    };

    const result = await engine.execute(partitions, operation);

    expect(result.results).toBeDefined();
    expect(result.statistics.partitionsProcessed).toBe(2);
    expect(result.statistics.itemsProcessed).toBe(4);
  });

  it('should handle empty partitions', async () => {
    const emptyFile = join(testDir, 'empty.jsonl');
    await fs.writeFile(emptyFile, '', 'utf-8');

    const partitions: Partition<any>[] = [
      { id: 'empty', location: emptyFile, filters: {} }
    ];

    const operation = {
      map: (item: any) => [['key', item]],
      reduce: (key: string, values: any[]) => values
    };

    const result = await engine.execute(partitions, operation);

    expect(result.results).toBeDefined();
    expect(result.statistics.partitionsProcessed).toBe(1);
    expect(result.statistics.itemsProcessed).toBe(0);
  });

  it('should handle errors in map function gracefully', async () => {
    const testFile = join(testDir, 'error.jsonl');
    await fs.writeFile(testFile, '{"value":1}\n', 'utf-8');

    const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };

    const operation = {
      map: (item: any) => {
        if (item.value === 1) throw new Error('Map error');
        return [['key', item.value]];
      },
      reduce: (key: string, values: any[]) => values
    };

    const result = await engine.execute([partition], operation);

    // MapReduce handles errors gracefully, returns statistics with failures
    expect(result.statistics.failures).toBeGreaterThan(0);
  });

  it('should support map operation returning multiple keys', async () => {
    const testFile = join(testDir, 'multi.jsonl');
    await fs.writeFile(testFile, '{"tags":["a","b"]}\n{"tags":["b","c"]}\n', 'utf-8');

    const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };

    const operation = {
      map: (item: any) => item.tags.map((tag: string) => [tag, 1]),
      reduce: (key: string, values: number[]) => values.reduce((sum, v) => sum + v, 0)
    };

    const result = await engine.execute([partition], operation);

    expect(result.results).toBeDefined();
    expect(result.statistics.itemsProcessed).toBe(2);
  });

  describe('sequential processing', () => {
    it('should process partitions sequentially when parallel is false', async () => {
      const p1File = join(testDir, 'seq1.jsonl');
      const p2File = join(testDir, 'seq2.jsonl');

      await fs.writeFile(p1File, '{"value":1}\n', 'utf-8');
      await fs.writeFile(p2File, '{"value":2}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'p1', location: p1File, filters: {} },
        { id: 'p2', location: p2File, filters: {} }
      ];

      const operation = {
        map: (item: any) => [['sum', item.value]],
        reduce: (key: string, values: any[]) => values.reduce((sum, v) => sum + v, 0)
      };

      engine.updateConfig({ parallel: false });
      const result = await engine.execute(partitions, operation);

      expect(result.statistics.partitionsProcessed).toBe(2);
      expect(result.statistics.itemsProcessed).toBe(2);
    });
  });

  describe('retry logic', () => {
    it('should retry failed partitions with exponential backoff', async () => {
      const testFile = join(testDir, 'retry.jsonl');
      await fs.writeFile(testFile, '{"value":1}\n', 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };

      let attempts = 0;
      const operation = {
        map: (item: any) => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Simulated transient error');
          }
          return [['key', item.value]];
        },
        reduce: (key: string, values: any[]) => values
      };

      engine.updateConfig({
        retryConfig: { maxRetries: 3, baseDelay: 10, maxDelay: 100, backoffMultiplier: 2 }
      });
      const result = await engine.execute([partition], operation);

      // Should succeed after retries
      expect(result.statistics.partitionsProcessed).toBe(1);
      expect(attempts).toBeGreaterThanOrEqual(3);
    });

    it('should fail after max retries exceeded', async () => {
      const testFile = join(testDir, 'fail.jsonl');
      await fs.writeFile(testFile, '{"value":1}\n', 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };

      const operation = {
        map: (item: any) => {
          throw new Error('Persistent error');
        },
        reduce: (key: string, values: any[]) => values
      };

      engine.updateConfig({
        retryConfig: { maxRetries: 2, baseDelay: 10, maxDelay: 100, backoffMultiplier: 2 }
      });
      const result = await engine.execute([partition], operation);

      expect(result.statistics.failures).toBeGreaterThan(0);
    });
  });

  describe('aggregate', () => {
    beforeEach(async () => {
      const p1File = join(testDir, 'agg1.jsonl');
      const p2File = join(testDir, 'agg2.jsonl');

      await fs.writeFile(p1File, '{"category":"A","value":10}\n{"category":"B","value":20}\n', 'utf-8');
      await fs.writeFile(p2File, '{"category":"A","value":15}\n{"category":"B","value":25}\n', 'utf-8');
    });

    it('should aggregate data across partitions in parallel', async () => {
      const partitions: Partition<any>[] = [
        { id: 'p1', location: join(testDir, 'agg1.jsonl'), filters: {} },
        { id: 'p2', location: join(testDir, 'agg2.jsonl'), filters: {} }
      ];

      const aggregateFn = (items: any[], partitionId: string) => {
        return items.reduce((sum, item) => sum + item.value, 0);
      };

      engine.updateConfig({ parallel: true });
      const results = await engine.aggregate(partitions, aggregateFn);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(30); // p1: 10 + 20
      expect(results[1]).toBe(40); // p2: 15 + 25
    });

    it('should aggregate data sequentially', async () => {
      const partitions: Partition<any>[] = [
        { id: 'p1', location: join(testDir, 'agg1.jsonl'), filters: {} },
        { id: 'p2', location: join(testDir, 'agg2.jsonl'), filters: {} }
      ];

      const aggregateFn = (items: any[], partitionId: string) => {
        return items.reduce((sum, item) => sum + item.value, 0);
      };

      engine.updateConfig({ parallel: false });
      const results = await engine.aggregate(partitions, aggregateFn);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(30); // p1: 10 + 20
      expect(results[1]).toBe(40); // p2: 15 + 25
    });
  });

  describe('count', () => {
    it('should count all items across partitions', async () => {
      const p1File = join(testDir, 'count1.jsonl');
      const p2File = join(testDir, 'count2.jsonl');

      await fs.writeFile(p1File, '{"id":1}\n{"id":2}\n', 'utf-8');
      await fs.writeFile(p2File, '{"id":3}\n{"id":4}\n{"id":5}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'p1', location: p1File, filters: {} },
        { id: 'p2', location: p2File, filters: {} }
      ];

      const total = await engine.count(partitions);

      expect(total).toBe(5);
    });

    it('should count items in single partition', async () => {
      const testFile = join(testDir, 'single.jsonl');
      await fs.writeFile(testFile, '{"id":1}\n{"id":2}\n{"id":3}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'test', location: testFile, filters: {} }
      ];

      const total = await engine.count(partitions);

      expect(total).toBe(3);
    });
  });

  describe('getPartitionStats', () => {
    it('should return statistics for multiple partitions', async () => {
      const p1File = join(testDir, 'stats1.jsonl');
      const p2File = join(testDir, 'stats2.jsonl');

      await fs.writeFile(p1File, '{"value":1}\n{"value":2}\n', 'utf-8');
      await fs.writeFile(p2File, '{"value":3}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'p1', location: p1File, filters: {} },
        { id: 'p2', location: p2File, filters: {} }
      ];

      const stats = await engine.getPartitionStats(partitions);

      expect(stats).toHaveLength(2);
      expect(stats[0].partitionId).toBe('p1');
      expect(stats[0].itemCount).toBe(2);
      expect(stats[0].size).toBeGreaterThan(0);
      expect(stats[1].partitionId).toBe('p2');
      expect(stats[1].itemCount).toBe(1);
    });

    it('should handle empty partition stats', async () => {
      const emptyFile = join(testDir, 'empty-stats.jsonl');
      await fs.writeFile(emptyFile, '', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'empty', location: emptyFile, filters: {} }
      ];

      const stats = await engine.getPartitionStats(partitions);

      expect(stats).toHaveLength(1);
      expect(stats[0].itemCount).toBe(0);
    });
  });

  describe('map operation', () => {
    it('should map over partition items', async () => {
      const testFile = join(testDir, 'map.jsonl');
      await fs.writeFile(testFile, '{"value":1}\n{"value":2}\n{"value":3}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'test', location: testFile, filters: {} }
      ];

      const results = await engine.map(partitions, (item: any, partition: string) => {
        return [['result', item.value * 2]];
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should map across multiple partitions', async () => {
      const p1File = join(testDir, 'map1.jsonl');
      const p2File = join(testDir, 'map2.jsonl');

      await fs.writeFile(p1File, '{"value":1}\n', 'utf-8');
      await fs.writeFile(p2File, '{"value":2}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'p1', location: p1File, filters: {} },
        { id: 'p2', location: p2File, filters: {} }
      ];

      const results = await engine.map(partitions, (item: any, partition: string) => {
        return [['partition', partition]];
      });

      expect(results).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        parallel: false,
        maxConcurrency: 15,
        retryConfig: {
          maxRetries: 5,
          baseDelay: 2000,
          maxDelay: 20000,
          backoffMultiplier: 3
        }
      };

      engine.updateConfig(newConfig);
      const config = engine.getConfig();

      expect(config.parallel).toBe(false);
      expect(config.maxConcurrency).toBe(15);
      expect(config.retryConfig.maxRetries).toBe(5);
      expect(config.retryConfig.baseDelay).toBe(2000);
    });

    it('should preserve other config values when partially updating', () => {
      const originalConfig = engine.getConfig();

      engine.updateConfig({ maxConcurrency: 20 });
      const updatedConfig = engine.getConfig();

      expect(updatedConfig.maxConcurrency).toBe(20);
      expect(updatedConfig.parallel).toBe(originalConfig.parallel);
      expect(updatedConfig.retryConfig.maxRetries).toBe(originalConfig.retryConfig.maxRetries);
    });

    it('should return current configuration', () => {
      const config = engine.getConfig();

      expect(config).toHaveProperty('parallel');
      expect(config).toHaveProperty('maxConcurrency');
      expect(config).toHaveProperty('retryConfig');
      expect(config.retryConfig).toHaveProperty('maxRetries');
      expect(config.retryConfig).toHaveProperty('baseDelay');
    });
  });

  describe('concurrency control', () => {
    it('should respect maxConcurrency setting', async () => {
      const partitions: Partition<any>[] = [];

      // Create 10 partitions
      for (let i = 0; i < 10; i++) {
        const file = join(testDir, `concurrent-${i}.jsonl`);
        await fs.writeFile(file, `{"value":${i}}\n`, 'utf-8');
        partitions.push({ id: `p${i}`, location: file, filters: {} });
      }

      const operation = {
        map: (item: any) => [['sum', item.value]],
        reduce: (key: string, values: any[]) => values.reduce((sum, v) => sum + v, 0)
      };

      engine.updateConfig({ parallel: true, maxConcurrency: 3 });
      const result = await engine.execute(partitions, operation);

      expect(result.statistics.partitionsProcessed).toBe(10);
      expect(result.statistics.itemsProcessed).toBe(10);
    });
  });

  describe('reduce phase', () => {
    it('should handle errors in reduce function', async () => {
      const testFile = join(testDir, 'reduce-error.jsonl');
      await fs.writeFile(testFile, '{"value":1}\n', 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };

      const operation = {
        map: (item: any) => [['key', item.value]],
        reduce: (key: string, values: any[]) => {
          throw new Error('Reduce error');
        }
      };

      await expect(
        engine.execute([partition], operation)
      ).rejects.toThrow();
    });
  });
});
