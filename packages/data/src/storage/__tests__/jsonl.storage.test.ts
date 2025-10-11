/**
 * Tests for JsonlRowStorage
 */

import { JsonlRowStorage } from '../jsonl.storage';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('JsonlRowStorage', () => {
  let storage: JsonlRowStorage;
  let testDir: string;
  let testFile: string;

  beforeEach(async () => {
    storage = new JsonlRowStorage();
    testDir = join(tmpdir(), `jsonl-storage-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    testFile = join(testDir, 'test.jsonl');
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('appendRow', () => {
    it('should append single row to file', async () => {
      const row = { id: 1, name: 'test' };

      await storage.appendRow(testFile, row);

      const rows = await storage.readAll(testFile);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(row);
    });

    it('should append multiple rows sequentially', async () => {
      await storage.appendRow(testFile, { id: 1 });
      await storage.appendRow(testFile, { id: 2 });
      await storage.appendRow(testFile, { id: 3 });

      const rows = await storage.readAll(testFile);
      expect(rows).toHaveLength(3);
      expect(rows.map(r => r.id)).toEqual([1, 2, 3]);
    });

    it('should create file if it does not exist', async () => {
      await storage.appendRow(testFile, { test: 1 });

      const exists = await storage.exists(testFile);
      expect(exists).toBe(true);
    });
  });

  describe('appendRows', () => {
    it('should append multiple rows at once', async () => {
      const rows = [
        { id: 1, name: 'one' },
        { id: 2, name: 'two' },
        { id: 3, name: 'three' }
      ];

      await storage.appendRows(testFile, rows);

      const result = await storage.readAll(testFile);
      expect(result).toEqual(rows);
    });

    it('should handle empty array', async () => {
      await storage.appendRows(testFile, []);

      const rows = await storage.readAll(testFile);
      expect(rows).toHaveLength(0);
    });
  });

  describe('read', () => {
    it('should read rows with offset and limit', async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      await storage.appendRows(testFile, rows);

      const result = await storage.read(testFile, 3, 4);

      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(3);
      expect(result[3].id).toBe(6);
    });

    it('should handle offset beyond file size', async () => {
      await storage.appendRows(testFile, [{ id: 1 }, { id: 2 }]);

      const result = await storage.read(testFile, 10, 5);

      expect(result).toHaveLength(0);
    });
  });

  describe('readAll', () => {
    it('should read all rows from file', async () => {
      const rows = [{ a: 1 }, { b: 2 }, { c: 3 }];
      await storage.appendRows(testFile, rows);

      const result = await storage.readAll(testFile);

      expect(result).toEqual(rows);
    });

    it('should return empty array for non-existent file', async () => {
      const result = await storage.readAll(join(testDir, 'nonexistent.jsonl'));

      expect(result).toEqual([]);
    });

    it('should handle empty file', async () => {
      await fs.writeFile(testFile, '', 'utf-8');

      const result = await storage.readAll(testFile);

      expect(result).toEqual([]);
    });

    it('should skip malformed lines', async () => {
      await fs.writeFile(testFile,
        '{"valid":1}\n' +
        'invalid json\n' +
        '{"valid":2}\n',
        'utf-8'
      );

      const result = await storage.readAll(testFile);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ valid: 1 });
      expect(result[1]).toEqual({ valid: 2 });
    });
  });

  describe('writeAll', () => {
    it('should overwrite file with new rows', async () => {
      await storage.appendRows(testFile, [{ id: 1 }, { id: 2 }]);
      await storage.writeAll(testFile, [{ id: 3 }, { id: 4 }]);

      const rows = await storage.readAll(testFile);

      expect(rows).toEqual([{ id: 3 }, { id: 4 }]);
    });

    it('should create backup if backup option is true', async () => {
      await storage.appendRows(testFile, [{ id: 1 }]);
      await storage.writeAll(testFile, [{ id: 2 }], { backup: true });

      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(f => f.startsWith('test.jsonl.backup'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });

  describe('count', () => {
    it('should return number of rows', async () => {
      await storage.appendRows(testFile, [{ a: 1 }, { b: 2 }, { c: 3 }]);

      const count = await storage.count(testFile);

      expect(count).toBe(3);
    });

    it('should return 0 for non-existent file', async () => {
      const count = await storage.count(join(testDir, 'nonexistent.jsonl'));

      expect(count).toBe(0);
    });
  });

  describe('stream', () => {
    it('should stream rows in chunks', async () => {
      const rows = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      await storage.appendRows(testFile, rows);

      const chunks: any[][] = [];
      for await (const chunk of storage.stream(testFile, 25)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toHaveLength(25);
      expect(chunks[3]).toHaveLength(25);
      expect(chunks[0][0].id).toBe(0);
      expect(chunks[3][24].id).toBe(99);
    });

    it('should handle partial last chunk', async () => {
      const rows = Array.from({ length: 23 }, (_, i) => ({ id: i }));
      await storage.appendRows(testFile, rows);

      const chunks: any[][] = [];
      for await (const chunk of storage.stream(testFile, 10)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[2]).toHaveLength(3);
    });
  });

  describe('exists', () => {
    it('should return true if file exists', async () => {
      await storage.appendRow(testFile, { test: 1 });

      const result = await storage.exists(testFile);

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      const result = await storage.exists(join(testDir, 'nonexistent.jsonl'));

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      await storage.appendRow(testFile, { test: 1 });
      await storage.delete(testFile);

      const exists = await storage.exists(testFile);
      expect(exists).toBe(false);
    });

    it('should throw when deleting non-existent file', async () => {
      await expect(
        storage.delete(join(testDir, 'nonexistent.jsonl'))
      ).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return file statistics', async () => {
      const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
      await storage.appendRows(testFile, rows);

      const stats = await storage.getStats(testFile);

      expect(stats.path).toBe(testFile);
      expect(stats.sizeBytes).toBeGreaterThan(0);
      expect(stats.created).toBeDefined();
      expect(stats.modified).toBeDefined();
      expect(stats.itemCount).toBe(3);
    });

    it('should throw for non-existent file', async () => {
      await expect(
        storage.getStats(join(testDir, 'nonexistent.jsonl'))
      ).rejects.toThrow();
    });
  });

  describe('backup', () => {
    it('should create backup file', async () => {
      await storage.appendRows(testFile, [{ id: 1 }, { id: 2 }]);

      const backupPath = await storage.backup(testFile);

      expect(backupPath).toContain('.backup');
      expect(await storage.exists(backupPath)).toBe(true);

      const backupData = await storage.readAll(backupPath);
      expect(backupData).toHaveLength(2);
    });

    it('should throw when backing up non-existent file', async () => {
      await expect(
        storage.backup(join(testDir, 'nonexistent.jsonl'))
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle read errors gracefully', async () => {
      // Try to read a directory as a file
      await expect(storage.readAll(testDir)).rejects.toThrow();
    });

    it('should handle empty rows in appendRows', async () => {
      await storage.appendRows(testFile, []);
      const count = await storage.count(testFile);
      expect(count).toBe(0);
    });

    it('should handle malformed JSON in stream', async () => {
      await fs.writeFile(testFile, 'valid\ninvalid json\n{"id":2}\n', 'utf-8');

      const chunks: any[][] = [];
      for await (const chunk of storage.stream(testFile, 10)) {
        chunks.push(chunk);
      }

      // Should skip the malformed line
      expect(chunks.flat()).toHaveLength(1);
    });
  });
});
