/**
 * BaseManager Tests
 *
 * Comprehensive test suite for BaseManager with dependency injection
 */

import { BaseManager, BaseManagerConfig, BaseManagerDependencies, ValidationResult } from '../base.manager';
import { BaseRepository } from '../base.repository';
import { DataLayer } from '../../layer/data.layer';
import { FilterCriteria, Query, QueryResult } from '../../layer/data.types';

// Test entity type
interface TestItem {
  id: string;
  title: string;
  status: 'active' | 'completed';
  createdAt: string;
}

// Concrete implementation for testing
class TestManager extends BaseManager<TestItem> {
  protected async validate(item: TestItem): Promise<ValidationResult> {
    const errors: string[] = [];
    if (!item.title) errors.push('Title is required');
    if (!item.status) errors.push('Status is required');
    return { isValid: errors.length === 0, errors };
  }

  protected async discoverNamespaces(): Promise<void> {
    this.namespaceService.setAvailableNamespaces(['active', 'completed', 'archived']);
  }

  protected async loadStats(): Promise<void> {
    await this.statsService.updateStats();
  }
}

// Mock factory function
function createMockDependencies(): BaseManagerDependencies<TestItem> {
  const mockRepository: jest.Mocked<BaseRepository<TestItem>> = {
    initialize: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue({
      data: [],
      metadata: { totalCount: 0, returnedCount: 0, partitionsQueried: [], executionTime: 0, cacheHit: false }
    }),
    findById: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockImplementation((items) => Promise.resolve(Array.isArray(items) ? items : [items])),
    update: jest.fn().mockResolvedValue(0),
    updateById: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(0),
    deleteById: jest.fn().mockResolvedValue(false),
    count: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
    getStats: jest.fn().mockResolvedValue({ totalItems: 0, lastUpdated: '2025-01-01T00:00:00.000Z' }),
    updateStats: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined)
  } as any;

  const mockDataLayer: jest.Mocked<Partial<DataLayer<TestItem>>> = {
    initialize: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({
      data: [],
      metadata: { totalCount: 0, returnedCount: 0, partitionsQueried: [], executionTime: 0, cacheHit: false }
    }),
    disconnect: jest.fn().mockResolvedValue(undefined)
  };

  const mockDateProvider = jest.fn(() => new Date('2025-01-01T00:00:00.000Z'));

  return {
    repository: mockRepository,
    dataLayer: mockDataLayer as any,
    dateProvider: mockDateProvider
  };
}

describe('BaseManager', () => {
  let config: BaseManagerConfig;
  let mockDeps: BaseManagerDependencies<TestItem>;

  beforeEach(() => {
    config = {
      basePath: '/test',
      collection: 'items',
      defaultNamespace: 'active',
      supportedNamespaces: ['active', 'completed', 'archived']
    };

    mockDeps = createMockDependencies();
  });

  describe('Initialization', () => {
    it('should initialize repository', async () => {
      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      expect(mockDeps.repository.initialize).toHaveBeenCalled();
    });

    it('should create DataLayer when useDataLayer is true', async () => {
      const manager = new TestManager({ ...config, useDataLayer: true }, mockDeps);
      await manager.initialize();

      expect(mockDeps.dataLayer!.initialize).toHaveBeenCalled();
    });

    it('should discover namespaces during initialization', async () => {
      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const namespaces = manager.getAvailableNamespaces();
      expect(namespaces).toEqual(['active', 'completed', 'archived']);
    });

    it('should load stats during initialization', async () => {
      mockDeps.repository.count = jest.fn().mockResolvedValue(10);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const stats = await manager.getStats();
      expect(stats.totalItems).toBe(10);
    });

    it('should use injected dateProvider', async () => {
      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const stats = await manager.getStats();
      expect(stats.lastUpdated).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('Query Operations', () => {
    it('should get all items', async () => {
      const items: TestItem[] = [
        { id: '1', title: 'Item 1', status: 'active', createdAt: '2025-01-01' },
        { id: '2', title: 'Item 2', status: 'completed', createdAt: '2025-01-02' }
      ];
      mockDeps.repository.findAll = jest.fn().mockResolvedValue(items);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.getAllItems();
      expect(result).toEqual(items);
      expect(mockDeps.repository.findAll).toHaveBeenCalled();
    });

    it('should get items by namespace using DataLayer', async () => {
      const items: TestItem[] = [{ id: '1', title: 'Active Item', status: 'active', createdAt: '2025-01-01' }];
      mockDeps.dataLayer!.query = jest.fn().mockResolvedValue({
        data: items,
        metadata: { totalCount: 1, returnedCount: 1, partitionsQueried: ['active'], executionTime: 5, cacheHit: false }
      });

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.getItemsByNamespace('active');
      expect(result).toEqual(items);
      expect(mockDeps.dataLayer!.query).toHaveBeenCalledWith({ partitions: ['active'] });
    });

    it('should get item by ID', async () => {
      const item: TestItem = { id: '1', title: 'Item 1', status: 'active', createdAt: '2025-01-01' };
      mockDeps.repository.findById = jest.fn().mockResolvedValue(item);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.getItemById('1');
      expect(result).toEqual(item);
      expect(mockDeps.repository.findById).toHaveBeenCalledWith('1');
    });

    it('should search with criteria', async () => {
      const items: TestItem[] = [{ id: '1', title: 'Active Item', status: 'active', createdAt: '2025-01-01' }];
      const criteria: FilterCriteria<TestItem> = { status: 'active' };
      mockDeps.repository.findAll = jest.fn().mockResolvedValue(items);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.search(criteria);
      expect(result).toEqual(items);
      expect(mockDeps.repository.findAll).toHaveBeenCalledWith(criteria);
    });

    it('should query with pagination and sorting', async () => {
      const queryResult: QueryResult<TestItem> = {
        data: [{ id: '1', title: 'Item 1', status: 'active', createdAt: '2025-01-01' }],
        metadata: { totalCount: 10, returnedCount: 1, partitionsQueried: [], executionTime: 5, cacheHit: false }
      };
      const query: Partial<Query<TestItem>> = {
        filters: { status: 'active' },
        sort: { field: 'createdAt', direction: 'desc' },
        limit: 1,
        offset: 0
      };
      mockDeps.repository.find = jest.fn().mockResolvedValue(queryResult);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.query(query);
      expect(result).toEqual(queryResult);
      expect(mockDeps.repository.find).toHaveBeenCalledWith(query);
    });
  });

  describe('Create Operations', () => {
    it('should create single item with validation', async () => {
      const newItem: Partial<TestItem> = {
        title: 'New Item',
        status: 'active',
        createdAt: '2025-01-01'
      };
      const createdItem: TestItem = { id: expect.any(String), ...newItem } as TestItem;

      mockDeps.repository.create = jest.fn().mockImplementation((items) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        return Promise.resolve(itemsArray);
      });

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.createItem(newItem);
      expect(result.title).toBe('New Item');
      expect(result.status).toBe('active');
      expect(result.id).toBeDefined();
    });

    it('should generate ID if not provided', async () => {
      const newItem: Partial<TestItem> = {
        title: 'New Item',
        status: 'active',
        createdAt: '2025-01-01'
      };

      mockDeps.repository.create = jest.fn().mockImplementation((items) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        return Promise.resolve(itemsArray);
      });

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.createItem(newItem);
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should throw error if validation fails', async () => {
      const invalidItem: Partial<TestItem> = {
        title: '', // Invalid: empty title
        status: 'active',
        createdAt: '2025-01-01'
      };

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      await expect(manager.createItem(invalidItem)).rejects.toThrow('Validation failed: Title is required');
    });

    it('should call beforeCreate hook', async () => {
      const newItem: Partial<TestItem> = {
        id: '1',
        title: 'New Item',
        status: 'active',
        createdAt: '2025-01-01'
      };

      mockDeps.repository.create = jest.fn().mockImplementation((items) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        return Promise.resolve(itemsArray);
      });

      const manager = new TestManager(config, mockDeps);
      const beforeCreateSpy = jest.spyOn(manager as any, 'beforeCreate');

      await manager.initialize();
      await manager.createItem(newItem);

      expect(beforeCreateSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Item' }));
    });

    it('should call afterCreate hook', async () => {
      const newItem: Partial<TestItem> = {
        id: '1',
        title: 'New Item',
        status: 'active',
        createdAt: '2025-01-01'
      };

      mockDeps.repository.create = jest.fn().mockImplementation((items) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        return Promise.resolve(itemsArray);
      });

      const manager = new TestManager(config, mockDeps);
      const afterCreateSpy = jest.spyOn(manager as any, 'afterCreate');

      await manager.initialize();
      await manager.createItem(newItem);

      expect(afterCreateSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Item' }));
    });

    it('should create multiple items', async () => {
      const newItems: Partial<TestItem>[] = [
        { title: 'Item 1', status: 'active', createdAt: '2025-01-01' },
        { title: 'Item 2', status: 'completed', createdAt: '2025-01-02' }
      ];

      mockDeps.repository.create = jest.fn().mockImplementation((items) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        return Promise.resolve(itemsArray);
      });

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.createItems(newItems);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Item 1');
      expect(result[1].title).toBe('Item 2');
    });

    it('should update stats after create', async () => {
      const newItem: Partial<TestItem> = {
        id: '1',
        title: 'New Item',
        status: 'active',
        createdAt: '2025-01-01'
      };

      let callCount = 0;
      mockDeps.repository.count = jest.fn().mockImplementation(() => Promise.resolve(++callCount));
      mockDeps.repository.create = jest.fn().mockImplementation((items) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        return Promise.resolve(itemsArray);
      });

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const statsBefore = await manager.getStats();
      expect(statsBefore.totalItems).toBe(1);

      await manager.createItem(newItem);

      const statsAfter = await manager.getStats();
      expect(statsAfter.totalItems).toBe(2);
    });
  });

  describe('Update Operations', () => {
    it('should update item by ID', async () => {
      const updates: Partial<TestItem> = { title: 'Updated Title' };
      const updatedItem: TestItem = { id: '1', title: 'Updated Title', status: 'active', createdAt: '2025-01-01' };

      mockDeps.repository.updateById = jest.fn().mockResolvedValue(updatedItem);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.updateItem('1', updates);
      expect(result).toEqual(updatedItem);
      expect(mockDeps.repository.updateById).toHaveBeenCalledWith('1', updates);
    });

    it('should call beforeUpdate hook', async () => {
      const updates: Partial<TestItem> = { title: 'Updated Title' };
      const updatedItem: TestItem = { id: '1', title: 'Updated Title', status: 'active', createdAt: '2025-01-01' };

      mockDeps.repository.updateById = jest.fn().mockResolvedValue(updatedItem);

      const manager = new TestManager(config, mockDeps);
      const beforeUpdateSpy = jest.spyOn(manager as any, 'beforeUpdate');

      await manager.initialize();
      await manager.updateItem('1', updates);

      expect(beforeUpdateSpy).toHaveBeenCalledWith('1', updates);
    });

    it('should call afterUpdate hook', async () => {
      const updates: Partial<TestItem> = { title: 'Updated Title' };
      const updatedItem: TestItem = { id: '1', title: 'Updated Title', status: 'active', createdAt: '2025-01-01' };

      mockDeps.repository.updateById = jest.fn().mockResolvedValue(updatedItem);

      const manager = new TestManager(config, mockDeps);
      const afterUpdateSpy = jest.spyOn(manager as any, 'afterUpdate');

      await manager.initialize();
      await manager.updateItem('1', updates);

      expect(afterUpdateSpy).toHaveBeenCalledWith(updatedItem);
    });

    it('should update multiple items by criteria', async () => {
      const criteria: FilterCriteria<TestItem> = { status: 'active' };
      const updates: Partial<TestItem> = { status: 'completed' };

      mockDeps.repository.update = jest.fn().mockResolvedValue(3);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const count = await manager.updateItems(criteria, updates);
      expect(count).toBe(3);
      expect(mockDeps.repository.update).toHaveBeenCalledWith(criteria, updates);
    });

    it('should update stats after update', async () => {
      const updates: Partial<TestItem> = { title: 'Updated Title' };
      const updatedItem: TestItem = { id: '1', title: 'Updated Title', status: 'active', createdAt: '2025-01-01' };

      mockDeps.repository.updateById = jest.fn().mockResolvedValue(updatedItem);
      const updateStatsSpy = jest.spyOn(mockDeps.repository, 'count');

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();
      await manager.updateItem('1', updates);

      expect(updateStatsSpy).toHaveBeenCalled();
    });
  });

  describe('Delete Operations', () => {
    it('should delete item by ID', async () => {
      mockDeps.repository.deleteById = jest.fn().mockResolvedValue(true);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const result = await manager.deleteItem('1');
      expect(result).toBe(true);
      expect(mockDeps.repository.deleteById).toHaveBeenCalledWith('1');
    });

    it('should call beforeDelete hook', async () => {
      mockDeps.repository.deleteById = jest.fn().mockResolvedValue(true);

      const manager = new TestManager(config, mockDeps);
      const beforeDeleteSpy = jest.spyOn(manager as any, 'beforeDelete');

      await manager.initialize();
      await manager.deleteItem('1');

      expect(beforeDeleteSpy).toHaveBeenCalledWith('1');
    });

    it('should call afterDelete hook', async () => {
      mockDeps.repository.deleteById = jest.fn().mockResolvedValue(true);

      const manager = new TestManager(config, mockDeps);
      const afterDeleteSpy = jest.spyOn(manager as any, 'afterDelete');

      await manager.initialize();
      await manager.deleteItem('1');

      expect(afterDeleteSpy).toHaveBeenCalledWith('1');
    });

    it('should delete multiple items by criteria', async () => {
      const criteria: FilterCriteria<TestItem> = { status: 'completed' };
      mockDeps.repository.delete = jest.fn().mockResolvedValue(5);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const count = await manager.deleteItems(criteria);
      expect(count).toBe(5);
      expect(mockDeps.repository.delete).toHaveBeenCalledWith(criteria);
    });

    it('should update stats after delete', async () => {
      mockDeps.repository.deleteById = jest.fn().mockResolvedValue(true);
      const updateStatsSpy = jest.spyOn(mockDeps.repository, 'count');

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();
      await manager.deleteItem('1');

      expect(updateStatsSpy).toHaveBeenCalled();
    });
  });

  describe('Count and Exists', () => {
    it('should count items without criteria', async () => {
      mockDeps.repository.count = jest.fn().mockResolvedValue(10);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const count = await manager.count();
      expect(count).toBe(10);
      expect(mockDeps.repository.count).toHaveBeenCalledWith(undefined);
    });

    it('should count items with criteria', async () => {
      const criteria: FilterCriteria<TestItem> = { status: 'active' };
      mockDeps.repository.count = jest.fn().mockResolvedValue(5);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const count = await manager.count(criteria);
      expect(count).toBe(5);
      expect(mockDeps.repository.count).toHaveBeenCalledWith(criteria);
    });

    it('should check if item exists', async () => {
      const criteria: FilterCriteria<TestItem> = { id: '1' };
      mockDeps.repository.exists = jest.fn().mockResolvedValue(true);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const exists = await manager.exists(criteria);
      expect(exists).toBe(true);
      expect(mockDeps.repository.exists).toHaveBeenCalledWith(criteria);
    });
  });

  describe('Statistics', () => {
    it('should return current stats', async () => {
      mockDeps.repository.count = jest.fn().mockResolvedValue(15);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const stats = await manager.getStats();
      expect(stats.totalItems).toBe(15);
      expect(stats.lastUpdated).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should update stats on demand', async () => {
      let count = 10;
      mockDeps.repository.count = jest.fn().mockImplementation(() => Promise.resolve(count));

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const statsBefore = await manager.getStats();
      expect(statsBefore.totalItems).toBe(10);

      count = 20;
      // Force stats update through a create operation
      mockDeps.repository.create = jest.fn().mockImplementation((items) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        return Promise.resolve(itemsArray);
      });

      await manager.createItem({ id: '1', title: 'New', status: 'active', createdAt: '2025-01-01' });

      const statsAfter = await manager.getStats();
      expect(statsAfter.totalItems).toBe(20);
    });
  });

  describe('Namespace Management', () => {
    it('should return available namespaces', async () => {
      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      const namespaces = manager.getAvailableNamespaces();
      expect(namespaces).toEqual(['active', 'completed', 'archived']);
    });

    it('should check if namespace is supported', async () => {
      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      expect(manager.isNamespaceSupported('active')).toBe(true);
      expect(manager.isNamespaceSupported('invalid')).toBe(false);
    });
  });

  describe('Clear and Disconnect', () => {
    it('should clear all data', async () => {
      mockDeps.repository.clear = jest.fn().mockResolvedValue(undefined);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      await manager.clear();
      expect(mockDeps.repository.clear).toHaveBeenCalled();
    });

    it('should disconnect repository', async () => {
      mockDeps.repository.disconnect = jest.fn().mockResolvedValue(undefined);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      await manager.disconnect();
      expect(mockDeps.repository.disconnect).toHaveBeenCalled();
    });

    it('should disconnect DataLayer if present', async () => {
      mockDeps.dataLayer!.disconnect = jest.fn().mockResolvedValue(undefined);

      const manager = new TestManager(config, mockDeps);
      await manager.initialize();

      await manager.disconnect();
      expect(mockDeps.dataLayer!.disconnect).toHaveBeenCalled();
    });
  });
});
