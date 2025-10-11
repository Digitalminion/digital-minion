/**
 * Tests for NamespaceMetadataManager
 */

import { NamespaceMetadataManager } from '../namespace-metadata.manager';
import { PartitionSchemaConfig } from '../namespace.types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('NamespaceMetadataManager', () => {
  let manager: NamespaceMetadataManager;
  let testDir: string;

  beforeEach(async () => {
    manager = new NamespaceMetadataManager();
    testDir = join(tmpdir(), `namespace-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createNamespace', () => {
    it('should create namespace with metadata', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year', 'country'],
        partitions: {
          year: { type: 'string', regex: '^\\d{4}$', required: true },
          country: { type: 'string', regex: '^[A-Z]{2}$', required: true }
        }
      };

      const metadata = await manager.createNamespace({
        namespace: 'transactions',
        basePath: testDir,
        partitionSchema,
        dataFormat: 'jsonl'
      });

      expect(metadata.namespace).toBe('transactions');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.partitionSchema).toEqual(partitionSchema);
      expect(metadata.dataFormat).toBe('jsonl');
      expect(metadata.discoveredPartitions).toEqual([]);
    });

    it('should create directory structure', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      const namespacePath = join(testDir, 'test');
      const dataPath = join(namespacePath, 'data');
      const metaPath = join(namespacePath, 'namespace.meta.json');

      const namespaceExists = await fs.access(namespacePath).then(() => true).catch(() => false);
      const dataExists = await fs.access(dataPath).then(() => true).catch(() => false);
      const metaExists = await fs.access(metaPath).then(() => true).catch(() => false);

      expect(namespaceExists).toBe(true);
      expect(dataExists).toBe(true);
      expect(metaExists).toBe(true);
    });

    it('should throw error if namespace already exists', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      await expect(
        manager.createNamespace({
          namespace: 'test',
          basePath: testDir,
          partitionSchema
        })
      ).rejects.toThrow('already exists');
    });

    it('should validate partition schema on creation', async () => {
      const invalidSchema: PartitionSchemaConfig = {
        order: ['year', 'country'],
        partitions: {
          year: { type: 'string', required: true }
          // Missing 'country' partition
        }
      };

      await expect(
        manager.createNamespace({
          namespace: 'test',
          basePath: testDir,
          partitionSchema: invalidSchema
        })
      ).rejects.toThrow();
    });

    it('should include custom metadata if provided', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      const custom = { description: 'Test namespace', owner: 'test-user' };

      const metadata = await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema,
        custom
      });

      expect(metadata.custom).toEqual(custom);
    });
  });

  describe('loadMetadata', () => {
    it('should load existing namespace metadata', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      const created = await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      const loaded = await manager.loadMetadata(testDir, 'test');

      expect(loaded.namespace).toBe(created.namespace);
      expect(loaded.version).toBe(created.version);
      expect(loaded.partitionSchema).toEqual(created.partitionSchema);
    });

    it('should throw error if namespace does not exist', async () => {
      await expect(
        manager.loadMetadata(testDir, 'nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('saveMetadata', () => {
    it('should save metadata updates', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      const metadata = await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      metadata.custom = { updated: true };

      await manager.saveMetadata(testDir, 'test', metadata);

      const loaded = await manager.loadMetadata(testDir, 'test');
      expect(loaded.custom).toEqual({ updated: true });
    });

    it('should update timestamp on save', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      const metadata = await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      const originalUpdated = metadata.updated;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await manager.saveMetadata(testDir, 'test', metadata);

      const loaded = await manager.loadMetadata(testDir, 'test');
      expect(loaded.updated).not.toBe(originalUpdated);
    });

    it('should create backup when saving', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      const metadata = await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      metadata.custom = { version: 2 };
      await manager.saveMetadata(testDir, 'test', metadata);

      const namespacePath = join(testDir, 'test');
      const files = await fs.readdir(namespacePath);
      const backupFiles = files.filter(f => f.startsWith('namespace.meta.json.backup'));

      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });

  describe('updatePartitionSchema', () => {
    it('should update partition schema', async () => {
      const initialSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema: initialSchema
      });

      const newSchema: PartitionSchemaConfig = {
        order: ['year', 'month'],
        partitions: {
          year: { type: 'string', required: true },
          month: { type: 'string', regex: '^\\d{2}$', required: true }
        }
      };

      const updated = await manager.updatePartitionSchema(testDir, 'test', newSchema);

      expect(updated.partitionSchema.order).toEqual(['year', 'month']);
      expect(updated.partitionSchema.partitions).toHaveProperty('month');
    });

    it('should validate new schema before updating', async () => {
      const initialSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema: initialSchema
      });

      const invalidSchema: PartitionSchemaConfig = {
        order: ['year', 'month'],
        partitions: {
          year: { type: 'string', required: true }
          // Missing month partition
        }
      };

      await expect(
        manager.updatePartitionSchema(testDir, 'test', invalidSchema)
      ).rejects.toThrow();
    });
  });

  describe('addDiscoveredPartition', () => {
    it('should add new partition to discovered list', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      await manager.addDiscoveredPartition(testDir, 'test', {
        path: 'year=2025',
        values: { year: '2025' },
        created: new Date().toISOString(),
        itemCount: 10,
        lastUpdated: new Date().toISOString(),
        sizeBytes: 1024
      });

      const metadata = await manager.loadMetadata(testDir, 'test');
      expect(metadata.discoveredPartitions).toHaveLength(1);
      expect(metadata.discoveredPartitions[0]?.path).toBe('year=2025');
      expect(metadata.discoveredPartitions[0]?.itemCount).toBe(10);
    });

    it('should update existing partition if already discovered', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      await manager.addDiscoveredPartition(testDir, 'test', {
        path: 'year=2025',
        values: { year: '2025' },
        created: new Date().toISOString(),
        itemCount: 10,
        lastUpdated: new Date().toISOString(),
        sizeBytes: 1024
      });

      await manager.addDiscoveredPartition(testDir, 'test', {
        path: 'year=2025',
        values: { year: '2025' },
        created: new Date().toISOString(),
        itemCount: 20,
        lastUpdated: new Date().toISOString(),
        sizeBytes: 2048
      });

      const metadata = await manager.loadMetadata(testDir, 'test');
      expect(metadata.discoveredPartitions).toHaveLength(1);
      expect(metadata.discoveredPartitions[0]?.itemCount).toBe(20);
      expect(metadata.discoveredPartitions[0]?.sizeBytes).toBe(2048);
    });
  });

  describe('removeDiscoveredPartition', () => {
    it('should remove partition from discovered list', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      await manager.addDiscoveredPartition(testDir, 'test', {
        path: 'year=2025',
        values: { year: '2025' },
        created: new Date().toISOString(),
        itemCount: 10,
        lastUpdated: new Date().toISOString(),
        sizeBytes: 1024
      });

      await manager.removeDiscoveredPartition(testDir, 'test', 'year=2025');

      const metadata = await manager.loadMetadata(testDir, 'test');
      expect(metadata.discoveredPartitions).toHaveLength(0);
    });
  });

  describe('updatePartitionInfo', () => {
    it('should update partition statistics', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      await manager.addDiscoveredPartition(testDir, 'test', {
        path: 'year=2025',
        values: { year: '2025' },
        created: new Date().toISOString(),
        itemCount: 10,
        lastUpdated: new Date().toISOString(),
        sizeBytes: 1024
      });

      await manager.updatePartitionInfo(testDir, 'test', 'year=2025', {
        itemCount: 15,
        sizeBytes: 1536
      });

      const metadata = await manager.loadMetadata(testDir, 'test');
      const partition = metadata.discoveredPartitions.find(p => p.path === 'year=2025');

      expect(partition?.itemCount).toBe(15);
      expect(partition?.sizeBytes).toBe(1536);
    });

    it('should throw error if partition not found', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema
      });

      await expect(
        manager.updatePartitionInfo(testDir, 'test', 'year=2025', { itemCount: 10 })
      ).rejects.toThrow('not found');
    });
  });

  describe('discoverPartitions', () => {
    it('should discover partitions from filesystem', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year', 'country'],
        partitions: {
          year: { type: 'string', required: true },
          country: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema,
        dataFormat: 'jsonl'
      });

      // Create partition directories and data files
      const partition1 = join(testDir, 'test', 'data', 'year=2025', 'country=US');
      const partition2 = join(testDir, 'test', 'data', 'year=2025', 'country=CA');

      await fs.mkdir(partition1, { recursive: true });
      await fs.mkdir(partition2, { recursive: true });

      await fs.writeFile(join(partition1, 'data.jsonl'), '{"id":1}\n{"id":2}\n', 'utf-8');
      await fs.writeFile(join(partition2, 'data.jsonl'), '{"id":3}\n', 'utf-8');

      const discovered = await manager.discoverPartitions(testDir, 'test');

      expect(discovered).toHaveLength(2);
      expect(discovered.some(p => p.path === 'year=2025/country=US')).toBe(true);
      expect(discovered.some(p => p.path === 'year=2025/country=CA')).toBe(true);
    });

    it('should count items in JSONL files', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema,
        dataFormat: 'jsonl'
      });

      const partition = join(testDir, 'test', 'data', 'year=2025');
      await fs.mkdir(partition, { recursive: true });
      await fs.writeFile(join(partition, 'data.jsonl'), '{"id":1}\n{"id":2}\n{"id":3}\n', 'utf-8');

      const discovered = await manager.discoverPartitions(testDir, 'test');

      expect(discovered[0]?.itemCount).toBe(3);
    });

    it('should update metadata with discovered partitions', async () => {
      const partitionSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', required: true }
        }
      };

      await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema,
        dataFormat: 'jsonl'
      });

      const partition = join(testDir, 'test', 'data', 'year=2025');
      await fs.mkdir(partition, { recursive: true });
      await fs.writeFile(join(partition, 'data.jsonl'), '', 'utf-8');

      await manager.discoverPartitions(testDir, 'test');

      const metadata = await manager.loadMetadata(testDir, 'test');
      expect(metadata.discoveredPartitions).toHaveLength(1);
    });
  });

  describe('Schema Validation', () => {
    it('should reject empty partition order', async () => {
      const invalidSchema: PartitionSchemaConfig = {
        order: [],
        partitions: {}
      };

      await expect(
        manager.createNamespace({
          namespace: 'test',
          basePath: testDir,
          partitionSchema: invalidSchema
        })
      ).rejects.toThrow('at least one partition');
    });

    it('should reject invalid regex in partition', async () => {
      const invalidSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: { type: 'string', regex: '[invalid(regex', required: true }
        }
      };

      await expect(
        manager.createNamespace({
          namespace: 'test',
          basePath: testDir,
          partitionSchema: invalidSchema
        })
      ).rejects.toThrow('Invalid regex');
    });

    it('should validate deriveFromData function', async () => {
      const invalidSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: {
            type: 'string',
            required: true,
            deriveFromData: 'invalid javascript syntax {'
          }
        }
      };

      await expect(
        manager.createNamespace({
          namespace: 'test',
          basePath: testDir,
          partitionSchema: invalidSchema
        })
      ).rejects.toThrow();
    });

    it('should accept valid deriveFromData function', async () => {
      const validSchema: PartitionSchemaConfig = {
        order: ['year'],
        partitions: {
          year: {
            type: 'string',
            required: true,
            deriveFromData: 'new Date(item.timestamp).getFullYear().toString()'
          }
        }
      };

      const metadata = await manager.createNamespace({
        namespace: 'test',
        basePath: testDir,
        partitionSchema: validSchema
      });

      expect(metadata.partitionSchema.partitions.year.deriveFromData).toBe(
        'new Date(item.timestamp).getFullYear().toString()'
      );
    });
  });
});
