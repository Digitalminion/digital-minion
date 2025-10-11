/**
 * Tests for JSONLAdapter
 */

import { JSONLAdapter } from '../jsonl.adapter';
import { Partition } from '../../data.types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('JSONLAdapter', () => {
  let adapter: JSONLAdapter;
  let testDir: string;
  let testFile: string;
  let partition: Partition<any>;

  beforeEach(async () => {
    adapter = new JSONLAdapter();
    testDir = join(tmpdir(), `jsonl-adapter-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    testFile = join(testDir, 'data.jsonl');

    partition = {
      id: 'test-partition',
      location: testFile,
      filters: {}
    };

    await adapter.connect();
  });

  afterEach(async () => {
    await adapter.disconnect();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('connect/disconnect', () => {
    it('should connect successfully', async () => {
      const newAdapter = new JSONLAdapter();
      await expect(newAdapter.connect()).resolves.not.toThrow();
    });

    it('should disconnect successfully', async () => {
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });

    it('should throw error when reading without connection', async () => {
      const newAdapter = new JSONLAdapter();
      await expect(newAdapter.read(partition)).rejects.toThrow('not connected');
    });
  });

  describe('read', () => {
    it('should read data from partition', async () => {
      await fs.writeFile(testFile, '{"id":1}\n{"id":2}\n', 'utf-8');

      const data = await adapter.read(partition);

      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({ id: 1 });
      expect(data[1]).toEqual({ id: 2 });
    });

    it('should return empty array for non-existent file', async () => {
      const data = await adapter.read(partition);
      expect(data).toEqual([]);
    });

    it('should handle invalid JSON gracefully', async () => {
      await fs.writeFile(testFile, 'invalid\n{"id":1}\n', 'utf-8');
      const data = await adapter.read(partition);
      // JSONL adapter skips invalid lines
      expect(data).toHaveLength(1);
    });
  });

  describe('write', () => {
    it('should write data to partition', async () => {
      const data = [{ id: 1 }, { id: 2 }];

      await adapter.write(partition, data);

      const content = await fs.readFile(testFile, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual({ id: 1 });
    });

    it('should overwrite existing data', async () => {
      await fs.writeFile(testFile, '{"id":999}\n', 'utf-8');

      await adapter.write(partition, [{ id: 1 }]);

      const data = await adapter.read(partition);
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({ id: 1 });
    });
  });

  describe('append', () => {
    it('should append data to partition', async () => {
      await fs.writeFile(testFile, '{"id":1}\n', 'utf-8');

      await adapter.append(partition, [{ id: 2 }, { id: 3 }]);

      const data = await adapter.read(partition);
      expect(data).toHaveLength(3);
      expect(data.map(d => d.id)).toEqual([1, 2, 3]);
    });

    it('should create file if it does not exist', async () => {
      await adapter.append(partition, [{ id: 1 }]);

      const data = await adapter.read(partition);
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({ id: 1 });
    });
  });

  describe('delete', () => {
    it('should delete items matching filter', async () => {
      await adapter.write(partition, [
        { id: 1, status: 'active' },
        { id: 2, status: 'inactive' },
        { id: 3, status: 'active' }
      ]);

      const deletedCount = await adapter.delete(partition, { status: 'active' });

      expect(deletedCount).toBe(2);

      const data = await adapter.read(partition);
      expect(data).toHaveLength(1);
      expect(data[0].status).toBe('inactive');
    });

    it('should return 0 if no items match', async () => {
      await adapter.write(partition, [{ id: 1, status: 'active' }]);

      const deletedCount = await adapter.delete(partition, { status: 'nonexistent' });

      expect(deletedCount).toBe(0);
    });
  });

  describe('count', () => {
    it('should count items in partition', async () => {
      await adapter.write(partition, [{ id: 1 }, { id: 2 }, { id: 3 }]);

      const count = await adapter.count(partition);

      expect(count).toBe(3);
    });

    it('should return 0 for empty partition', async () => {
      const count = await adapter.count(partition);
      expect(count).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true if partition exists', async () => {
      await adapter.write(partition, [{ id: 1 }]);

      const exists = await adapter.exists(partition);

      expect(exists).toBe(true);
    });

    it('should return false if partition does not exist', async () => {
      const exists = await adapter.exists(partition);
      expect(exists).toBe(false);
    });
  });

  describe('type', () => {
    it('should have type jsonl', () => {
      expect(adapter.type).toBe('jsonl');
    });
  });
});
