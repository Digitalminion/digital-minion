/**
 * Tests for NamespaceManager
 */

import { NamespaceManager } from '../namespace.manager';
import { NamespaceMetadataManager } from '../namespace-metadata.manager';
import { PartitionSchemaConfig } from '../namespace.types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('NamespaceManager', () => {
  let manager: NamespaceManager;
  let metadataManager: NamespaceMetadataManager;
  let testDir: string;

  const partitionSchema: PartitionSchemaConfig = {
    order: ['year', 'country'],
    partitions: {
      year: { type: 'string', regex: '^\\d{4}$', required: true },
      country: { type: 'string', regex: '^[A-Z]{2}$', required: true }
    }
  };

  beforeEach(async () => {
    testDir = join(tmpdir(), `namespace-mgr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    manager = new NamespaceManager({ basePath: testDir });
    metadataManager = new NamespaceMetadataManager();

    // Create namespace
    await metadataManager.createNamespace({
      namespace: 'transactions',
      basePath: testDir,
      partitionSchema,
      dataFormat: 'jsonl'
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('validateWrite', () => {
    it('should validate valid item', async () => {
      const item = { year: '2025', country: 'US', amount: 100 };
      const result = await manager.validateWrite('transactions', item);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.partitionPath).toBe('year=2025/country=US');
      expect(result.partitionValues).toEqual({ year: '2025', country: 'US' });
    });

    it('should reject item with missing required field', async () => {
      const item = { year: '2025', amount: 100 }; // Missing country

      const result = await manager.validateWrite('transactions', item);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('MISSING_REQUIRED');
      expect(result.errors[0]?.field).toBe('country');
      expect(result.partitionPath).toBeUndefined();
    });

    it('should use default values for missing fields', async () => {
      const schemaWithDefaults: PartitionSchemaConfig = {
        order: ['year', 'country'],
        partitions: {
          year: { type: 'string', required: true },
          country: { type: 'string', required: false, defaultValue: 'XX' }
        }
      };

      await metadataManager.createNamespace({
        namespace: 'with-defaults',
        basePath: testDir,
        partitionSchema: schemaWithDefaults
      });

      const item = { year: '2025' };
      const result = await manager.validateWrite('with-defaults', item);

      expect(result.isValid).toBe(true);
      expect(result.partitionValues).toEqual({ year: '2025', country: 'XX' });
    });

    it('should reject item with type mismatch', async () => {
      const item = { year: 2025, country: 'US' }; // year should be string

      const result = await manager.validateWrite('transactions', item);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.code).toBe('TYPE_MISMATCH');
      expect(result.errors[0]?.field).toBe('year');
    });

    it('should reject item failing regex validation', async () => {
      const item = { year: '25', country: 'US' }; // year should be 4 digits

      const result = await manager.validateWrite('transactions', item);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.code).toBe('REGEX_MISMATCH');
      expect(result.errors[0]?.field).toBe('year');
    });

    it('should validate date types', async () => {
      const dateSchema: PartitionSchemaConfig = {
        order: ['created'],
        partitions: {
          created: { type: 'date', required: true }
        }
      };

      await metadataManager.createNamespace({
        namespace: 'dated',
        basePath: testDir,
        partitionSchema: dateSchema
      });

      const validItem1 = { created: new Date() };
      const validItem2 = { created: '2025-01-15T00:00:00.000Z' };
      const invalidItem = { created: 'not-a-date' };

      expect((await manager.validateWrite('dated', validItem1)).isValid).toBe(true);
      expect((await manager.validateWrite('dated', validItem2)).isValid).toBe(true);
      expect((await manager.validateWrite('dated', invalidItem)).isValid).toBe(false);
    });

    it('should collect multiple validation errors', async () => {
      const item = { year: 25, country: 123 }; // Both wrong type

      const result = await manager.validateWrite('transactions', item);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('getPartitionPath', () => {
    it('should return partition path for valid item', async () => {
      const item = { year: '2025', country: 'US', amount: 100 };
      const path = await manager.getPartitionPath('transactions', item);

      expect(path).toBe('year=2025/country=US');
    });

    it('should throw error for invalid item', async () => {
      const item = { year: '2025' }; // Missing country

      await expect(
        manager.getPartitionPath('transactions', item)
      ).rejects.toThrow('validation failed');
    });
  });

  describe('resolveQueryPartitions', () => {
    beforeEach(async () => {
      // Add some discovered partitions
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');

      await metadataManager.addDiscoveredPartition(testDir, 'transactions', {
        path: 'year=2025/country=US',
        values: { year: '2025', country: 'US' },
        created: new Date().toISOString(),
        itemCount: 10,
        lastUpdated: new Date().toISOString(),
        sizeBytes: 1024
      });

      await metadataManager.addDiscoveredPartition(testDir, 'transactions', {
        path: 'year=2025/country=CA',
        values: { year: '2025', country: 'CA' },
        created: new Date().toISOString(),
        itemCount: 5,
        lastUpdated: new Date().toISOString(),
        sizeBytes: 512
      });

      await metadataManager.addDiscoveredPartition(testDir, 'transactions', {
        path: 'year=2024/country=US',
        values: { year: '2024', country: 'US' },
        created: new Date().toISOString(),
        itemCount: 20,
        lastUpdated: new Date().toISOString(),
        sizeBytes: 2048
      });
    });

    it('should return all partitions if no filter', async () => {
      const paths = await manager.resolveQueryPartitions('transactions');

      expect(paths).toHaveLength(3);
    });

    it('should filter by single partition value', async () => {
      const paths = await manager.resolveQueryPartitions('transactions', {
        partitionFilter: { year: '2025' }
      });

      expect(paths).toHaveLength(2);
      expect(paths.every(p => p.includes('year=2025'))).toBe(true);
    });

    it('should filter by multiple partition values', async () => {
      const paths = await manager.resolveQueryPartitions('transactions', {
        partitionFilter: { year: '2025', country: 'US' }
      });

      expect(paths).toHaveLength(1);
      expect(paths[0]).toBe('year=2025/country=US');
    });

    it('should support array of allowed values', async () => {
      const paths = await manager.resolveQueryPartitions('transactions', {
        partitionFilter: { country: ['US', 'CA'] }
      });

      expect(paths).toHaveLength(3); // All partitions have US or CA
    });
  });

  describe('getPartitionFilePath', () => {
    it('should build file path for JSONL format', () => {
      const path = manager.getPartitionFilePath('transactions', 'year=2025/country=US', 'jsonl');

      expect(path).toContain('transactions');
      expect(path).toContain('year=2025');
      expect(path).toContain('country=US');
      expect(path).toContain('data.jsonl');
    });

    it('should build file path for JSON format', () => {
      const path = manager.getPartitionFilePath('transactions', 'year=2025/country=US', 'json');

      expect(path).toContain('data.json');
    });
  });

  describe('ensurePartitionExists', () => {
    it('should create partition directory and data file', async () => {
      await manager.ensurePartitionExists('transactions', 'year=2025/country=UK');

      const partition = join(testDir, 'transactions', 'data', 'year=2025', 'country=UK');
      const dataFile = join(partition, 'data.jsonl');

      const dirExists = await fs.access(partition).then(() => true).catch(() => false);
      const fileExists = await fs.access(dataFile).then(() => true).catch(() => false);

      expect(dirExists).toBe(true);
      expect(fileExists).toBe(true);
    });

    it('should create JSON file if format is JSON', async () => {
      await metadataManager.createNamespace({
        namespace: 'json-ns',
        basePath: testDir,
        partitionSchema,
        dataFormat: 'json'
      });

      await manager.ensurePartitionExists('json-ns', 'year=2025/country=UK', 'json');

      const dataFile = join(testDir, 'json-ns', 'data', 'year=2025', 'country=UK', 'data.json');
      const content = await fs.readFile(dataFile, 'utf-8');

      expect(content).toBe('[]');
    });

    it('should add partition to discovered partitions', async () => {
      await manager.ensurePartitionExists('transactions', 'year=2025/country=FR');

      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const partition = metadata.discoveredPartitions.find(p => p.path === 'year=2025/country=FR');

      expect(partition).toBeDefined();
      expect(partition?.values).toEqual({ year: '2025', country: 'FR' });
    });

    it('should not create duplicate if partition already exists', async () => {
      await manager.ensurePartitionExists('transactions', 'year=2025/country=DE');
      await manager.ensurePartitionExists('transactions', 'year=2025/country=DE');

      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const partitions = metadata.discoveredPartitions.filter(p => p.path === 'year=2025/country=DE');

      expect(partitions).toHaveLength(1);
    });
  });

  describe('Private Helper Methods', () => {
    it('should build partition path from values', async () => {
      const item = { year: '2025', country: 'US' };
      const validation = await manager.validateWrite('transactions', item);

      expect(validation.partitionPath).toBe('year=2025/country=US');
    });

    it('should follow partition order when building path', async () => {
      const multiSchema: PartitionSchemaConfig = {
        order: ['year', 'month', 'day'],
        partitions: {
          year: { type: 'string', required: true },
          month: { type: 'string', required: true },
          day: { type: 'string', required: true }
        }
      };

      await metadataManager.createNamespace({
        namespace: 'multi',
        basePath: testDir,
        partitionSchema: multiSchema
      });

      const item = { day: '15', month: '01', year: '2025' };
      const validation = await manager.validateWrite('multi', item);

      expect(validation.partitionPath).toBe('year=2025/month=01/day=15');
    });

    it('should skip optional missing fields when building path', async () => {
      const optionalSchema: PartitionSchemaConfig = {
        order: ['year', 'country'],
        partitions: {
          year: { type: 'string', required: true },
          country: { type: 'string', required: false }
        }
      };

      await metadataManager.createNamespace({
        namespace: 'optional',
        basePath: testDir,
        partitionSchema: optionalSchema
      });

      const item = { year: '2025' };
      const validation = await manager.validateWrite('optional', item);

      expect(validation.partitionPath).toBe('year=2025');
    });
  });
});
