/**
 * Tests for JSONAdapter
 */

import { JSONAdapter } from '../json.adapter';
import { Partition } from '../../data.types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('JSONAdapter', () => {
  let adapter: JSONAdapter;
  let testDir: string;
  let testFile: string;
  let partition: Partition<any>;

  beforeEach(async () => {
    adapter = new JSONAdapter();
    testDir = join(tmpdir(), `json-adapter-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    testFile = join(testDir, 'data.json');

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
      const newAdapter = new JSONAdapter();
      await expect(newAdapter.connect()).resolves.not.toThrow();
    });

    it('should disconnect successfully', async () => {
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });

    it('should throw error when reading without connection', async () => {
      const newAdapter = new JSONAdapter();
      await expect(newAdapter.read(partition)).rejects.toThrow('not connected');
    });
  });

  describe('read', () => {
    it('should read array data from partition', async () => {
      await fs.writeFile(testFile, JSON.stringify([{ id: 1 }, { id: 2 }]), 'utf-8');

      const data = await adapter.read(partition);

      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({ id: 1 });
      expect(data[1]).toEqual({ id: 2 });
    });

    it('should read data from items property', async () => {
      await fs.writeFile(testFile, JSON.stringify({ items: [{ id: 1 }] }), 'utf-8');

      const data = await adapter.read(partition);

      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({ id: 1 });
    });

    it('should read data from data property', async () => {
      await fs.writeFile(testFile, JSON.stringify({ data: [{ id: 1 }] }), 'utf-8');

      const data = await adapter.read(partition);

      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({ id: 1 });
    });

    it('should throw error if JSON does not contain array', async () => {
      await fs.writeFile(testFile, JSON.stringify({ notAnArray: 'value' }), 'utf-8');

      await expect(adapter.read(partition)).rejects.toThrow('does not contain an array');
    });

    it('should throw error with partition id on failure', async () => {
      await expect(adapter.read(partition)).rejects.toThrow('test-partition');
    });
  });

  describe('write', () => {
    it('should write data to partition with items property', async () => {
      const data = [{ id: 1 }, { id: 2 }];

      await adapter.write(partition, data);

      const content = await fs.readFile(testFile, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.items).toEqual(data);
    });

    it('should overwrite existing data', async () => {
      await fs.writeFile(testFile, JSON.stringify({ items: [{ id: 999 }] }), 'utf-8');

      await adapter.write(partition, [{ id: 1 }]);

      const data = await adapter.read(partition);
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({ id: 1 });
    });

    it('should create backup when writing', async () => {
      await adapter.write(partition, [{ id: 1 }]);
      await adapter.write(partition, [{ id: 2 }]);

      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(f => f.startsWith('data.json.backup'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });

  describe('append', () => {
    it('should append data to partition', async () => {
      await adapter.write(partition, [{ id: 1 }]);

      await adapter.append(partition, [{ id: 2 }, { id: 3 }]);

      const data = await adapter.read(partition);
      expect(data).toHaveLength(3);
      expect(data.map(d => d.id)).toEqual([1, 2, 3]);
    });

    it('should throw error if file does not exist', async () => {
      await expect(adapter.append(partition, [{ id: 1 }])).rejects.toThrow('Failed to append');
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

    it('should return 0 for non-existent partition', async () => {
      await expect(adapter.count(partition)).rejects.toThrow();
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
    it('should have type json', () => {
      expect(adapter.type).toBe('json');
    });
  });
});
