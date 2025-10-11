/**
 * Tests for JsonObjectStorage
 */

import { JsonObjectStorage } from '../json.storage';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('JsonObjectStorage', () => {
  let storage: JsonObjectStorage;
  let testDir: string;
  let testFile: string;

  beforeEach(async () => {
    storage = new JsonObjectStorage();
    // Create unique test directory for each test
    testDir = join(tmpdir(), `json-storage-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    testFile = join(testDir, 'test.json');
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('write', () => {
    it('should write JSON data to file', async () => {
      const data = { name: 'test', value: 123 };

      await storage.write(testFile, data);

      const content = await fs.readFile(testFile, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });

    it('should write pretty-printed JSON when pretty option is true', async () => {
      const data = { name: 'test', nested: { value: 123 } };

      await storage.write(testFile, data, { pretty: true });

      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toContain('\n');
      expect(content).toContain('  '); // Indentation
    });

    it('should create directories if createDirectories is true', async () => {
      const nestedFile = join(testDir, 'nested', 'deep', 'file.json');
      const data = { test: true };

      await storage.write(nestedFile, data, { createDirectories: true });

      const content = await fs.readFile(nestedFile, 'utf-8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should throw error if file exists and overwrite is false', async () => {
      const data = { test: 1 };
      await storage.write(testFile, data);

      await expect(
        storage.write(testFile, { test: 2 }, { overwrite: false })
      ).rejects.toThrow();
    });

    it('should overwrite file when overwrite is true', async () => {
      await storage.write(testFile, { test: 1 });
      await storage.write(testFile, { test: 2 }, { overwrite: true });

      const data = await storage.read(testFile);
      expect(data).toEqual({ test: 2 });
    });

    it('should create backup when backup option is true', async () => {
      await storage.write(testFile, { test: 1 });
      await storage.write(testFile, { test: 2 }, { backup: true });

      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(f => f.startsWith('test.json.backup'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });

  describe('read', () => {
    it('should read JSON data from file', async () => {
      const data = { name: 'test', value: 456 };
      await storage.write(testFile, data);

      const result = await storage.read(testFile);

      expect(result).toEqual(data);
    });

    it('should throw error if file does not exist', async () => {
      await expect(
        storage.read(join(testDir, 'nonexistent.json'))
      ).rejects.toThrow();
    });

    it('should handle complex nested objects', async () => {
      const data = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, 3],
              nested: { value: 'deep' }
            }
          }
        }
      };

      await storage.write(testFile, data);
      const result = await storage.read(testFile);

      expect(result).toEqual(data);
    });
  });

  describe('update', () => {
    it('should merge updates with existing data', async () => {
      await storage.write(testFile, { a: 1, b: 2 });
      await storage.update(testFile, { b: 3, c: 4 });

      const result = await storage.read(testFile);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should throw error if file does not exist', async () => {
      await expect(
        storage.update(join(testDir, 'nonexistent.json'), { test: 1 })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      await storage.write(testFile, { test: 1 });
      await storage.delete(testFile);

      await expect(storage.exists(testFile)).resolves.toBe(false);
    });

    it('should not throw if file does not exist', async () => {
      await expect(
        storage.delete(join(testDir, 'nonexistent.json'))
      ).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true if file exists', async () => {
      await storage.write(testFile, { test: 1 });

      const result = await storage.exists(testFile);

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      const result = await storage.exists(join(testDir, 'nonexistent.json'));

      expect(result).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return valid result for valid JSON file', async () => {
      await storage.write(testFile, { test: 1 });

      const result = await storage.validate(testFile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid result for corrupted file', async () => {
      await fs.writeFile(testFile, 'invalid json{]', 'utf-8');

      const result = await storage.validate(testFile);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate with schema - type mismatch', async () => {
      await storage.write(testFile, { name: 'test' });

      const schema = { type: 'array' as const };
      const result = await storage.validate(testFile, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'TYPE_MISMATCH'
        })
      );
    });

    it('should validate with schema - required fields', async () => {
      await storage.write(testFile, { name: 'test' });

      const schema = {
        type: 'object' as const,
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' as const },
          email: { type: 'string' as const }
        }
      };

      const result = await storage.validate(testFile, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'REQUIRED_FIELD_MISSING',
          message: expect.stringContaining('email')
        })
      );
    });

    it('should validate with schema - nested properties', async () => {
      await storage.write(testFile, { user: { name: 'test', age: 25 } });

      const schema = {
        type: 'object' as const,
        properties: {
          user: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              age: { type: 'number' as const }
            }
          }
        }
      };

      const result = await storage.validate(testFile, schema);

      expect(result.isValid).toBe(true);
    });

    it('should validate with schema - additional properties warning', async () => {
      await storage.write(testFile, { name: 'test', extra: 'field' });

      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const }
        },
        additionalProperties: false
      };

      const result = await storage.validate(testFile, schema);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'ADDITIONAL_PROPERTY'
        })
      );
    });

    it('should validate arrays with schema', async () => {
      await storage.write(testFile, [1, 2, 3]);

      const schema = {
        type: 'array' as const,
        items: { type: 'number' as const }
      };

      const result = await storage.validate(testFile, schema);

      expect(result.isValid).toBe(true);
    });

    it('should validate string patterns', async () => {
      await storage.write(testFile, { email: 'not-an-email' });

      const schema = {
        type: 'object' as const,
        properties: {
          email: {
            type: 'string' as const,
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          }
        }
      };

      const result = await storage.validate(testFile, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('pattern')
        })
      );
    });

    it('should validate number minimum', async () => {
      await storage.write(testFile, { age: 5 });

      const schema = {
        type: 'object' as const,
        properties: {
          age: {
            type: 'number' as const,
            minimum: 18
          }
        }
      };

      const result = await storage.validate(testFile, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('minimum')
        })
      );
    });

    it('should validate number maximum', async () => {
      await storage.write(testFile, { age: 200 });

      const schema = {
        type: 'object' as const,
        properties: {
          age: {
            type: 'number' as const,
            maximum: 150
          }
        }
      };

      const result = await storage.validate(testFile, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('maximum')
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return file statistics', async () => {
      await storage.write(testFile, { name: 'test', value: 123 });

      const stats = await storage.getStats(testFile);

      expect(stats.path).toBe(testFile);
      expect(stats.sizeBytes).toBeGreaterThan(0);
      expect(stats.created).toBeDefined();
      expect(stats.modified).toBeDefined();
      expect(stats.accessed).toBeDefined();
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        storage.getStats(join(testDir, 'nonexistent.json'))
      ).rejects.toThrow();
    });
  });

  describe('backup', () => {
    it('should create backup file', async () => {
      await storage.write(testFile, { test: 1 });

      const backupPath = await storage.backup(testFile);

      expect(backupPath).toContain('.backup');
      expect(await storage.exists(backupPath)).toBe(true);

      const backupData = await storage.read(backupPath);
      expect(backupData).toEqual({ test: 1 });
    });

    it('should throw error when backing up non-existent file', async () => {
      await expect(
        storage.backup(join(testDir, 'nonexistent.json'))
      ).rejects.toThrow();
    });
  });

  describe('validation error handling', () => {
    it('should handle validation errors on write', async () => {
      const data = { circular: null as any };
      data.circular = data; // Create circular reference

      await expect(
        storage.write(testFile, data, { validate: true })
      ).rejects.toThrow();
    });

    it('should skip data validation when validate option is false', async () => {
      const invalidData = { name: 123, shouldBeString: true };

      // With validate: false, it should write even with wrong types
      await expect(
        storage.write(testFile, invalidData, { validate: false })
      ).resolves.not.toThrow();

      const result = await storage.read(testFile);
      expect(result).toEqual(invalidData);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON during read', async () => {
      await fs.writeFile(testFile, 'not json', 'utf-8');

      await expect(storage.read(testFile)).rejects.toThrow('Invalid JSON');
    });

    it('should handle general read errors', async () => {
      // Try to read a directory as a file
      await expect(storage.read(testDir)).rejects.toThrow();
    });
  });
});
