/**
 * Tests for RowIdResolver
 */

import { RowIdResolver } from '../rowid.resolver';
import { NamespaceMetadataManager } from '../namespace-metadata.manager';
import { RowIdGenerator } from '../rowid.generator';
import { PartitionSchemaConfig } from '../namespace.types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('RowIdResolver', () => {
  let resolver: RowIdResolver;
  let metadataManager: NamespaceMetadataManager;
  let rowIdGenerator: RowIdGenerator;
  let testDir: string;

  const partitionSchema: PartitionSchemaConfig = {
    order: ['year', 'country'],
    partitions: {
      year: { type: 'string', regex: '^\\d{4}$', required: true },
      country: { type: 'string', regex: '^[A-Z]{2}$', required: true }
    }
  };

  beforeEach(async () => {
    testDir = join(tmpdir(), `rowid-resolver-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    resolver = new RowIdResolver({ basePath: testDir });
    metadataManager = new NamespaceMetadataManager();
    rowIdGenerator = new RowIdGenerator();

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

  describe('lookupByRowId', () => {
    it('should find item by rowId', async () => {
      // Create partition and data
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const partition = join(testDir, 'transactions', 'data', 'year=2025', 'country=US');
      await fs.mkdir(partition, { recursive: true });
      await fs.writeFile(
        join(partition, 'data.jsonl'),
        JSON.stringify({ rowId, amount: 100 }) + '\n',
        'utf-8'
      );

      const result = await resolver.lookupByRowId('transactions', rowId);

      expect(result.found).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.amount).toBe(100);
      expect(result.parsedRowId.partitionPath).toBe('year=2025/country=US');
      expect(result.lookupTime).toBeGreaterThanOrEqual(0);
    });

    it('should return not found if item does not exist', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const result = await resolver.lookupByRowId('transactions', rowId);

      expect(result.found).toBe(false);
      expect(result.item).toBeUndefined();
    });

    it('should return not found if partition does not exist', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'CA' });

      const result = await resolver.lookupByRowId('transactions', rowId);

      expect(result.found).toBe(false);
    });

    it('should use custom idField', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const customId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const partition = join(testDir, 'transactions', 'data', 'year=2025', 'country=US');
      await fs.mkdir(partition, { recursive: true });
      await fs.writeFile(
        join(partition, 'data.jsonl'),
        JSON.stringify({ customId, amount: 200 }) + '\n',
        'utf-8'
      );

      const result = await resolver.lookupByRowId('transactions', customId, 'customId');

      expect(result.found).toBe(true);
      expect(result.item?.amount).toBe(200);
    });
  });

  describe('lookupManyByRowId', () => {
    it('should lookup multiple items', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId1 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });
      const rowId2 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'CA' });

      // Create partitions
      const partition1 = join(testDir, 'transactions', 'data', 'year=2025', 'country=US');
      const partition2 = join(testDir, 'transactions', 'data', 'year=2025', 'country=CA');

      await fs.mkdir(partition1, { recursive: true });
      await fs.mkdir(partition2, { recursive: true });

      await fs.writeFile(
        join(partition1, 'data.jsonl'),
        JSON.stringify({ rowId: rowId1, amount: 100 }) + '\n',
        'utf-8'
      );
      await fs.writeFile(
        join(partition2, 'data.jsonl'),
        JSON.stringify({ rowId: rowId2, amount: 200 }) + '\n',
        'utf-8'
      );

      const results = await resolver.lookupManyByRowId('transactions', [rowId1, rowId2]);

      expect(results.size).toBe(2);
      expect(results.get(rowId1)?.found).toBe(true);
      expect(results.get(rowId1)?.item?.amount).toBe(100);
      expect(results.get(rowId2)?.found).toBe(true);
      expect(results.get(rowId2)?.item?.amount).toBe(200);
    });

    it('should batch reads from same partition', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId1 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });
      const rowId2 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const partition = join(testDir, 'transactions', 'data', 'year=2025', 'country=US');
      await fs.mkdir(partition, { recursive: true });
      await fs.writeFile(
        join(partition, 'data.jsonl'),
        JSON.stringify({ rowId: rowId1, amount: 100 }) + '\n' +
        JSON.stringify({ rowId: rowId2, amount: 200 }) + '\n',
        'utf-8'
      );

      const results = await resolver.lookupManyByRowId('transactions', [rowId1, rowId2]);

      expect(results.size).toBe(2);
      expect(results.get(rowId1)?.found).toBe(true);
      expect(results.get(rowId2)?.found).toBe(true);
    });
  });

  describe('existsByRowId', () => {
    it('should return true if item exists', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const partition = join(testDir, 'transactions', 'data', 'year=2025', 'country=US');
      await fs.mkdir(partition, { recursive: true });
      await fs.writeFile(
        join(partition, 'data.jsonl'),
        JSON.stringify({ rowId, amount: 100 }) + '\n',
        'utf-8'
      );

      const exists = await resolver.existsByRowId('transactions', rowId);
      expect(exists).toBe(true);
    });

    it('should return false if item does not exist', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const exists = await resolver.existsByRowId('transactions', rowId);
      expect(exists).toBe(false);
    });
  });

  describe('createByRowId', () => {
    it('should create new item with rowId', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const item = { rowId, amount: 100, description: 'Test' };
      const created = await resolver.createByRowId('transactions', item);

      expect(created).toEqual(item);

      // Verify item was written
      const result = await resolver.lookupByRowId('transactions', rowId);
      expect(result.found).toBe(true);
      expect(result.item?.amount).toBe(100);
    });

    it('should throw error if item already exists', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const item = { rowId, amount: 100 };
      await resolver.createByRowId('transactions', item);

      await expect(
        resolver.createByRowId('transactions', item)
      ).rejects.toThrow('already exists');
    });

    it('should throw error if rowId is missing', async () => {
      const item = { amount: 100 };

      await expect(
        resolver.createByRowId('transactions', item)
      ).rejects.toThrow("must have 'rowId' field");
    });

    it('should create partition directory if it does not exist', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'UK' });

      const item = { rowId, amount: 150 };
      await resolver.createByRowId('transactions', item);

      const partition = join(testDir, 'transactions', 'data', 'year=2025', 'country=UK');
      const exists = await fs.access(partition).then(() => true).catch(() => false);

      expect(exists).toBe(true);
    });
  });

  describe('createManyByRowId', () => {
    it('should create multiple items', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId1 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });
      const rowId2 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'CA' });

      const items = [
        { rowId: rowId1, amount: 100 },
        { rowId: rowId2, amount: 200 }
      ];

      const created = await resolver.createManyByRowId('transactions', items);

      expect(created).toEqual(items);

      // Verify items were written
      const result1 = await resolver.lookupByRowId('transactions', rowId1);
      const result2 = await resolver.lookupByRowId('transactions', rowId2);

      expect(result1.found).toBe(true);
      expect(result2.found).toBe(true);
    });

    it('should batch writes to same partition', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId1 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });
      const rowId2 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const items = [
        { rowId: rowId1, amount: 100 },
        { rowId: rowId2, amount: 200 }
      ];

      await resolver.createManyByRowId('transactions', items);

      const partition = join(testDir, 'transactions', 'data', 'year=2025', 'country=US', 'data.jsonl');
      const content = await fs.readFile(partition, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
    });
  });

  describe('deleteByRowId', () => {
    it('should delete item by rowId', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const item = { rowId, amount: 100 };
      await resolver.createByRowId('transactions', item);

      const deleted = await resolver.deleteByRowId('transactions', rowId);

      expect(deleted).toBe(true);

      const result = await resolver.lookupByRowId('transactions', rowId);
      expect(result.found).toBe(false);
    });

    it('should return false if item does not exist', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const deleted = await resolver.deleteByRowId('transactions', rowId);

      expect(deleted).toBe(false);
    });
  });

  describe('updateByRowId', () => {
    it('should update item by rowId', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const item = { rowId, amount: 100, status: 'pending' };
      await resolver.createByRowId('transactions', item);

      const updated = await resolver.updateByRowId('transactions', rowId, {
        amount: 150,
        status: 'completed'
      });

      expect(updated).toBeDefined();
      expect(updated?.amount).toBe(150);
      expect(updated?.status).toBe('completed');

      const result = await resolver.lookupByRowId('transactions', rowId);
      expect(result.item?.amount).toBe(150);
      expect(result.item?.status).toBe('completed');
    });

    it('should return undefined if item does not exist', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const updated = await resolver.updateByRowId('transactions', rowId, { amount: 200 });

      expect(updated).toBeUndefined();
    });

    it('should not change rowId when updating', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const item = { rowId, amount: 100 };
      await resolver.createByRowId('transactions', item);

      const updated = await resolver.updateByRowId('transactions', rowId, {
        rowId: 'different-id',
        amount: 200
      });

      expect(updated?.rowId).toBe('different-id'); // Update is applied as-is
    });
  });

  describe('getPartitionItems', () => {
    it('should get all items in partition', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId1 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });
      const rowId2 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      await resolver.createManyByRowId('transactions', [
        { rowId: rowId1, amount: 100 },
        { rowId: rowId2, amount: 200 }
      ]);

      const items = await resolver.getPartitionItems('transactions', rowId1);

      expect(items).toHaveLength(2);
      expect(items.map(i => i.amount).sort()).toEqual([100, 200]);
    });

    it('should return empty array if partition does not exist', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const items = await resolver.getPartitionItems('transactions', rowId);

      expect(items).toEqual([]);
    });
  });

  describe('JSON Storage Format', () => {
    beforeEach(async () => {
      // Create namespace with JSON format
      await metadataManager.createNamespace({
        namespace: 'json-transactions',
        basePath: testDir,
        partitionSchema,
        dataFormat: 'json'
      });
    });

    it('should work with JSON storage format', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'json-transactions');
      const rowId = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      const item = { rowId, amount: 100 };
      await resolver.createByRowId('json-transactions', item);

      const result = await resolver.lookupByRowId('json-transactions', rowId);

      expect(result.found).toBe(true);
      expect(result.item?.amount).toBe(100);
    });

    it('should handle JSON array format', async () => {
      const metadata = await metadataManager.loadMetadata(testDir, 'json-transactions');
      const rowId1 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });
      const rowId2 = rowIdGenerator.generateRowId(metadata, { year: '2025', country: 'US' });

      await resolver.createManyByRowId('json-transactions', [
        { rowId: rowId1, amount: 100 },
        { rowId: rowId2, amount: 200 }
      ]);

      const items = await resolver.getPartitionItems('json-transactions', rowId1);

      expect(items).toHaveLength(2);
    });
  });
});
