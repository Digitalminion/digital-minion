/**
 * Tests for StreamProcessor
 */

import { StreamProcessor } from '../stream.processor';
import { JSONLAdapter } from '../../../layer/adapters/jsonl.adapter';
import { Partition, StreamProgress } from '../../../layer/data.types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('StreamProcessor', () => {
  let processor: StreamProcessor;
  let adapter: JSONLAdapter;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `stream-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    adapter = new JSONLAdapter();
    await adapter.connect();

    processor = new StreamProcessor(adapter);
  });

  afterEach(async () => {
    await adapter.disconnect();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('stream', () => {
    it('should stream data in chunks', async () => {
      // Create test file with items
      const testFile = join(testDir, 'stream.jsonl');
      const items = Array.from({ length: 250 }, (_, i) => ({ id: i, value: `item${i}` }));
      await fs.writeFile(testFile, items.map(item => JSON.stringify(item)).join('\n'), 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };
      const chunks: any[] = [];

      for await (const chunk of processor.stream([partition], { chunkSize: 100 })) {
        chunks.push(chunk);
      }

      // Should have 3 chunks (100 + 100 + 50)
      expect(chunks).toHaveLength(3);
      expect(chunks[0].data).toHaveLength(100);
      expect(chunks[1].data).toHaveLength(100);
      expect(chunks[2].data).toHaveLength(50);
      expect(chunks[2].hasMore).toBe(false);
    });

    it('should handle multiple partitions', async () => {
      const file1 = join(testDir, 'p1.jsonl');
      const file2 = join(testDir, 'p2.jsonl');

      await fs.writeFile(file1, '{"id":1}\n{"id":2}\n', 'utf-8');
      await fs.writeFile(file2, '{"id":3}\n{"id":4}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'p1', location: file1, filters: {} },
        { id: 'p2', location: file2, filters: {} }
      ];

      const items: any[] = [];
      for await (const chunk of processor.stream(partitions, { chunkSize: 10 })) {
        items.push(...chunk.data);
      }

      expect(items).toHaveLength(4);
    });

    it('should call progress callback', async () => {
      const testFile = join(testDir, 'progress.jsonl');
      await fs.writeFile(testFile, '{"id":1}\n{"id":2}\n{"id":3}\n', 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };
      const progressUpdates: StreamProgress[] = [];

      for await (const chunk of processor.stream([partition], {
        chunkSize: 2,
        progressCallback: (progress) => progressUpdates.push(progress)
      })) {
        // Process chunks
      }

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]).toHaveProperty('processedItems');
      expect(progressUpdates[0]).toHaveProperty('memoryUsage');
    });

    it('should handle empty partitions', async () => {
      const emptyFile = join(testDir, 'empty.jsonl');
      await fs.writeFile(emptyFile, '', 'utf-8');

      const partition: Partition<any> = { id: 'empty', location: emptyFile, filters: {} };
      const chunks: any[] = [];

      for await (const chunk of processor.stream([partition])) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });

    it('should handle partition errors with early termination', async () => {
      const validFile = join(testDir, 'valid.jsonl');
      const invalidFile = join(testDir, 'invalid.jsonl');

      await fs.writeFile(validFile, '{"id":1}\n', 'utf-8');
      // Invalid file doesn't exist

      const partitions: Partition<any>[] = [
        { id: 'valid', location: validFile, filters: {} },
        { id: 'invalid', location: invalidFile, filters: {} }
      ];

      const items: any[] = [];
      for await (const chunk of processor.stream(partitions, { enableEarlyTermination: true })) {
        items.push(...chunk.data);
      }

      // Should process valid partition
      expect(items).toHaveLength(1);
    });

    it('should throw error on partition failure when early termination is disabled', async () => {
      const invalidFile = join(testDir, 'invalid-dir');
      // Create a directory instead of a file to cause read error
      await fs.mkdir(invalidFile, { recursive: true });

      const partitions: Partition<any>[] = [
        { id: 'invalid', location: invalidFile, filters: {} }
      ];

      let errorThrown = false;
      try {
        for await (const chunk of processor.stream(partitions, { enableEarlyTermination: false })) {
          // Should throw
        }
      } catch (error) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
    });

    it('should handle memory usage estimation with large buffers', async () => {
      const testFile = join(testDir, 'memory.jsonl');
      // Create items that will trigger memory limit
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000) // 1KB per item
      }));
      await fs.writeFile(testFile, items.map(item => JSON.stringify(item)).join('\n'), 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };
      const chunks: any[] = [];

      for await (const chunk of processor.stream([partition], {
        chunkSize: 100,
        maxMemoryUsage: 10000 // 10KB limit - will trigger early chunking
      })) {
        chunks.push(chunk);
      }

      // Should create multiple chunks due to memory limit
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should track time estimation in progress callback', async () => {
      const file1 = join(testDir, 'time1.jsonl');
      const file2 = join(testDir, 'time2.jsonl');

      await fs.writeFile(file1, '{"id":1}\n{"id":2}\n', 'utf-8');
      await fs.writeFile(file2, '{"id":3}\n{"id":4}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'p1', location: file1, filters: {} },
        { id: 'p2', location: file2, filters: {} }
      ];

      const progressUpdates: StreamProgress[] = [];

      for await (const chunk of processor.stream(partitions, {
        chunkSize: 2,
        progressCallback: (progress) => progressUpdates.push(progress)
      })) {
        // Process chunks
      }

      // Should have progress updates with time estimates
      expect(progressUpdates.length).toBeGreaterThan(0);
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate).toHaveProperty('estimatedTimeRemaining');
      expect(typeof lastUpdate.estimatedTimeRemaining).toBe('number');
    });
  });

  describe('streamTransform', () => {
    it('should transform streamed data', async () => {
      const testFile = join(testDir, 'transform.jsonl');
      await fs.writeFile(testFile, '{"value":1}\n{"value":2}\n{"value":3}\n', 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };
      const results: number[] = [];

      for await (const chunk of processor.streamTransform(
        [partition],
        (item) => item.value * 2,
        { chunkSize: 2 }
      )) {
        results.push(...chunk.data);
      }

      expect(results).toEqual([2, 4, 6]);
    });

    it('should preserve chunk metadata', async () => {
      const testFile = join(testDir, 'meta.jsonl');
      // Create enough items to fill a chunk
      const items = Array.from({ length: 150 }, (_, i) => `{"id":${i}}`).join('\n');
      await fs.writeFile(testFile, items, 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };
      const chunks: any[] = [];

      for await (const chunk of processor.streamTransform(
        [partition],
        (item) => ({ ...item, transformed: true }),
        { chunkSize: 100 }
      )) {
        chunks.push(chunk);
      }

      expect(chunks[0].metadata.partitionId).toBe('test');
      expect(chunks[0].data[0]).toHaveProperty('transformed');
    });
  });

  describe('streamFilter', () => {
    it('should filter streamed data', async () => {
      const testFile = join(testDir, 'filter.jsonl');
      await fs.writeFile(
        testFile,
        '{"value":1}\n{"value":2}\n{"value":3}\n{"value":4}\n',
        'utf-8'
      );

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };
      const results: any[] = [];

      for await (const chunk of processor.streamFilter(
        [partition],
        (item) => item.value % 2 === 0,
        { chunkSize: 2 }
      )) {
        results.push(...chunk.data);
      }

      expect(results).toHaveLength(2);
      expect(results.map(r => r.value)).toEqual([2, 4]);
    });

    it('should skip empty chunks after filtering', async () => {
      const testFile = join(testDir, 'skip.jsonl');
      await fs.writeFile(testFile, '{"value":1}\n{"value":3}\n{"value":5}\n', 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };
      const chunks: any[] = [];

      for await (const chunk of processor.streamFilter(
        [partition],
        (item) => item.value % 2 === 0
      )) {
        chunks.push(chunk);
      }

      // All items filtered out, no chunks emitted
      expect(chunks).toHaveLength(0);
    });
  });

  describe('streamReduce', () => {
    it('should reduce streamed data', async () => {
      const testFile = join(testDir, 'reduce.jsonl');
      await fs.writeFile(
        testFile,
        '{"value":1}\n{"value":2}\n{"value":3}\n{"value":4}\n',
        'utf-8'
      );

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };

      const sum = await processor.streamReduce(
        [partition],
        (acc, item) => acc + item.value,
        0,
        { chunkSize: 2 }
      );

      expect(sum).toBe(10);
    });

    it('should work with complex accumulator', async () => {
      const testFile = join(testDir, 'complex.jsonl');
      await fs.writeFile(
        testFile,
        '{"category":"a","value":1}\n{"category":"b","value":2}\n{"category":"a","value":3}\n',
        'utf-8'
      );

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };

      const grouped = await processor.streamReduce(
        [partition],
        (acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + item.value;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(grouped).toEqual({ a: 4, b: 2 });
    });
  });

  describe('collectAll', () => {
    it('should collect all data from stream', async () => {
      const testFile = join(testDir, 'collect.jsonl');
      await fs.writeFile(testFile, '{"id":1}\n{"id":2}\n{"id":3}\n', 'utf-8');

      const partition: Partition<any> = { id: 'test', location: testFile, filters: {} };

      const all = await processor.collectAll([partition], { chunkSize: 2 });

      expect(all).toHaveLength(3);
      expect(all.map(item => item.id)).toEqual([1, 2, 3]);
    });

    it('should handle multiple partitions', async () => {
      const file1 = join(testDir, 'c1.jsonl');
      const file2 = join(testDir, 'c2.jsonl');

      await fs.writeFile(file1, '{"id":1}\n{"id":2}\n', 'utf-8');
      await fs.writeFile(file2, '{"id":3}\n', 'utf-8');

      const partitions: Partition<any>[] = [
        { id: 'p1', location: file1, filters: {} },
        { id: 'p2', location: file2, filters: {} }
      ];

      const all = await processor.collectAll(partitions);

      expect(all).toHaveLength(3);
    });
  });
});
