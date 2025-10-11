/**
 * Tests for BaseRepository
 */

import { BaseRepository, BaseRepositoryConfig } from '../base.repository';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface TestItem {
  id: string;
  name: string;
  status?: string;
}

class TestRepository extends BaseRepository<TestItem> {
  protected getDataPath(): string {
    const extension = this.config.fileType === 'json' ? 'json' : 'jsonl';
    return join(this.config.basePath, `${this.config.collection}.${extension}`);
  }

  protected async validate(item: TestItem): Promise<boolean> {
    return !!item.id && !!item.name;
  }

  protected async loadStats() {
    // No-op for tests
    return undefined;
  }

  protected async saveStats() {
    // No-op for tests
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `repo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    const config: BaseRepositoryConfig = {
      basePath: testDir,
      collection: 'items',
      fileType: 'jsonl'
    };

    repository = new TestRepository(config);
    await repository.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('create', () => {
    it('should create new item', async () => {
      const item = { id: '1', name: 'Test Item' };
      const created = await repository.create(item);

      expect(created).toHaveLength(1);
      expect(created[0]).toEqual(item);

      const found = await repository.findById('1');
      expect(found).toEqual(item);
    });

    it('should create multiple items', async () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];
      const created = await repository.create(items);

      expect(created).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should find item by id', async () => {
      const item = { id: '1', name: 'Test' };
      await repository.create(item);

      const found = await repository.findById('1');
      expect(found).toEqual(item);
    });

    it('should return undefined for non-existent id', async () => {
      const found = await repository.findById('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all items', async () => {
      await repository.create({ id: '1', name: 'Item 1' });
      await repository.create({ id: '2', name: 'Item 2' });

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
    });

    it('should filter items by criteria', async () => {
      await repository.create({ id: '1', name: 'Active', status: 'active' });
      await repository.create({ id: '2', name: 'Inactive', status: 'inactive' });

      const active = await repository.findAll({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0]?.status).toBe('active');
    });

    it('should return empty array when no items', async () => {
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find first matching item', async () => {
      await repository.create({ id: '1', name: 'Test', status: 'active' });
      await repository.create({ id: '2', name: 'Test2', status: 'active' });

      const found = await repository.findOne({ status: 'active' });
      expect(found).toBeDefined();
      expect(found?.status).toBe('active');
    });

    it('should return undefined when no match', async () => {
      const found = await repository.findOne({ status: 'nonexistent' });
      expect(found).toBeUndefined();
    });
  });

  describe('updateById', () => {
    it('should update existing item', async () => {
      await repository.create({ id: '1', name: 'Original' });

      const updated = await repository.updateById('1', { name: 'Updated' });

      expect(updated?.name).toBe('Updated');

      const found = await repository.findById('1');
      expect(found?.name).toBe('Updated');
    });

    it('should return undefined for non-existent id', async () => {
      const updated = await repository.updateById('nonexistent', { name: 'Test' });
      expect(updated).toBeUndefined();
    });

    it('should preserve unchanged fields', async () => {
      await repository.create({ id: '1', name: 'Test', status: 'active' });

      await repository.updateById('1', { name: 'Updated' });

      const found = await repository.findById('1');
      expect(found?.status).toBe('active');
    });
  });

  describe('update', () => {
    it('should update items matching criteria', async () => {
      await repository.create([
        { id: '1', name: 'Test', status: 'active' },
        { id: '2', name: 'Test2', status: 'active' }
      ]);

      const count = await repository.update({ status: 'active' }, { status: 'updated' });

      expect(count).toBe(2);
    });
  });

  describe('deleteById', () => {
    it('should delete item by id', async () => {
      await repository.create({ id: '1', name: 'Test' });

      const deleted = await repository.deleteById('1');
      expect(deleted).toBe(true);

      const found = await repository.findById('1');
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent id', async () => {
      const deleted = await repository.deleteById('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete items matching criteria', async () => {
      await repository.create([
        { id: '1', name: 'Test', status: 'active' },
        { id: '2', name: 'Test2', status: 'inactive' }
      ]);

      const count = await repository.delete({ status: 'active' });
      expect(count).toBe(1);

      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('should count all items', async () => {
      await repository.create({ id: '1', name: 'Test1' });
      await repository.create({ id: '2', name: 'Test2' });

      const count = await repository.count();
      expect(count).toBe(2);
    });

    it('should count filtered items', async () => {
      await repository.create({ id: '1', name: 'Test', status: 'active' });
      await repository.create({ id: '2', name: 'Test', status: 'inactive' });

      const count = await repository.count({ status: 'active' });
      expect(count).toBe(1);
    });

    it('should return 0 when empty', async () => {
      const count = await repository.count();
      expect(count).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true for existing items', async () => {
      await repository.create({ id: '1', name: 'Test' });

      const exists = await repository.exists({ id: '1' });
      expect(exists).toBe(true);
    });

    it('should return false for non-existent items', async () => {
      const exists = await repository.exists({ id: 'nonexistent' });
      expect(exists).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return repository statistics', async () => {
      await repository.create({ id: '1', name: 'Test1' });
      await repository.create({ id: '2', name: 'Test2' });

      const stats = await repository.getStats();
      expect(stats.totalItems).toBe(2);
      expect(stats.lastUpdated).toBeDefined();
    });
  });

  describe('find with pagination', () => {
    beforeEach(async () => {
      await repository.create([
        { id: '1', name: 'Item 1', status: 'active' },
        { id: '2', name: 'Item 2', status: 'active' },
        { id: '3', name: 'Item 3', status: 'active' }
      ]);
    });

    it('should paginate results', async () => {
      const result = await repository.find({
        limit: 2,
        offset: 0
      });

      expect(result.data).toHaveLength(2);
      expect(result.metadata.totalCount).toBe(3);
      expect(result.metadata.returnedCount).toBe(2);
    });

    it('should handle offset', async () => {
      const result = await repository.find({
        limit: 2,
        offset: 1
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('2');
    });

    it('should sort results', async () => {
      const result = await repository.find({
        sort: { field: 'name', direction: 'desc' }
      });

      expect(result.data[0].name).toBe('Item 3');
      expect(result.data[2].name).toBe('Item 1');
    });

    it('should filter and paginate', async () => {
      const result = await repository.find({
        filters: { status: 'active' },
        limit: 2
      });

      expect(result.data).toHaveLength(2);
      expect(result.metadata.totalCount).toBe(3);
    });
  });

  describe('filter matching', () => {
    beforeEach(async () => {
      await repository.create([
        { id: '1', name: 'Alice', status: 'active' },
        { id: '2', name: 'Bob', status: 'inactive' },
        { id: '3', name: 'Charlie', status: 'active' }
      ]);
    });

    it('should filter with $eq operator', async () => {
      const result = await repository.findAll({ status: { $eq: 'active' } } as any);
      expect(result).toHaveLength(2);
    });

    it('should filter with $ne operator', async () => {
      const result = await repository.findAll({ status: { $ne: 'active' } } as any);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('inactive');
    });

    it('should filter with $in operator', async () => {
      const result = await repository.findAll({ id: { $in: ['1', '3'] } } as any);
      expect(result).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      await repository.create({ id: '1', name: 'Test' });
      await repository.clear();

      const all = await repository.findAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('disconnect', () => {
    it('should disconnect without error', async () => {
      await expect(repository.disconnect()).resolves.not.toThrow();
    });
  });

  describe('updateStats', () => {
    it('should update statistics', async () => {
      await repository.create({ id: '1', name: 'Test' });
      await repository.updateStats();

      const stats = await repository.getStats();
      expect(stats.totalItems).toBe(1);
    });
  });

  describe('JSON file type operations', () => {
    let jsonRepository: TestRepository;
    let jsonFile: string;

    beforeEach(async () => {
      const jsonTestDir = join(tmpdir(), `repo-json-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.mkdir(jsonTestDir, { recursive: true });

      jsonRepository = new TestRepository({
        basePath: jsonTestDir,
        collection: 'test-json',
        useDataLayer: false,
        fileType: 'json'
      });

      jsonFile = join(jsonTestDir, 'test-json.json');
      // Create empty JSON file
      await fs.writeFile(jsonFile, JSON.stringify({ items: [] }), 'utf-8');

      await jsonRepository.initialize();
    });

    afterEach(async () => {
      await jsonRepository.disconnect();
    });

    it('should initialize with JSON file type', async () => {
      expect(jsonRepository).toBeDefined();
    });

    it('should create items with JSON storage', async () => {
      const items = await jsonRepository.create([
        { id: '1', name: 'Item 1', status: 'active' },
        { id: '2', name: 'Item 2', status: 'active' }
      ]);

      expect(items).toHaveLength(2);

      const all = await jsonRepository.findAll();
      expect(all).toHaveLength(2);
    });

    it('should read items from JSON storage', async () => {
      await jsonRepository.create({ id: '1', name: 'Test', status: 'active' });

      const items = await jsonRepository.findAll();
      expect(items).toHaveLength(1);
    });

    it('should update items with JSON storage', async () => {
      await jsonRepository.create({ id: '1', name: 'Test', status: 'active' });

      await jsonRepository.update({ id: '1' }, { name: 'Updated' });

      const item = await jsonRepository.findById('1');
      expect(item?.name).toBe('Updated');
    });

    it('should delete items with JSON storage', async () => {
      await jsonRepository.create([
        { id: '1', name: 'Item 1', status: 'active' },
        { id: '2', name: 'Item 2', status: 'active' }
      ]);

      await jsonRepository.delete({ id: '1' });

      const items = await jsonRepository.findAll();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('2');
    });
  });

  describe('sorting edge cases', () => {
    it('should handle equal values in sort', async () => {
      await repository.create([
        { id: '1', name: 'Alice', age: 25, status: 'active' },
        { id: '2', name: 'Bob', age: 25, status: 'active' },
        { id: '3', name: 'Charlie', age: 25, status: 'active' }
      ]);

      const result = await repository.find({
        sort: { field: 'age', direction: 'asc' }
      });

      expect(result.data).toHaveLength(3);
      // All have same age, order should be stable
      expect(result.data.every(item => item.age === 25)).toBe(true);
    });
  });
});
