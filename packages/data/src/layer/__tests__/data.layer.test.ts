/**
 * Comprehensive tests for DataLayer with dependency injection
 */

import { DataLayer, DataLayerDependencies } from '../data.layer';
import { PartitionManifestManager } from '../partition-manifest.manager';
import { MapReduceEngine } from '../../operations/mapreduce/mapreduce.engine';
import { IndexManager } from '../../operations/index/index.manager';
import { CacheManager } from '../../operations/cache/cache.manager';
import { StreamProcessor } from '../../operations/stream/stream.processor';
import { FilterComposer } from '../../operations/filter/filter.composer';
import { RetryManager } from '../../operations/retry/retry.manager';
import { DataSourceAdapter, Partition } from '../data.types';

// Test helper to create mock dependencies
function createMockDependencies<T>(): Partial<DataLayerDependencies<T>> {
  const mockAdapter: jest.Mocked<DataSourceAdapter<T>> = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([]),
    write: jest.fn().mockResolvedValue(undefined),
    append: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(0),
    count: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false)
  } as any;

  const mockManifest: jest.Mocked<Partial<PartitionManifestManager<T>>> = {
    loadManifest: jest.fn().mockResolvedValue(undefined),
    createManifest: jest.fn().mockResolvedValue(undefined),
    discoverPartitions: jest.fn().mockResolvedValue(undefined),
    getAllPartitions: jest.fn().mockReturnValue([]),
    getPartition: jest.fn().mockReturnValue(undefined),
    getManifest: jest.fn().mockReturnValue({
      collection: 'test',
      version: '1.0',
      settings: {},
      partitions: []
    })
  };

  const mockCache: jest.Mocked<Partial<CacheManager<T[]>>> = {
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    delete: jest.fn().mockReturnValue(false),
    clear: jest.fn(),
    size: jest.fn().mockReturnValue(0),
    keys: jest.fn().mockReturnValue([])
  };

  const mockRetry: jest.Mocked<Partial<RetryManager>> = {
    execute: jest.fn().mockImplementation(async (fn) => {
      const value = await fn();
      return { success: true, value, attempts: 1, totalDelay: 0 };
    })
  };

  const mockMapReduce: jest.Mocked<Partial<MapReduceEngine<T, any>>> = {
    execute: jest.fn().mockResolvedValue({
      results: [],
      statistics: {
        itemsProcessed: 0,
        partitionsProcessed: 0,
        executionTime: 0,
        failures: 0,
        retries: 0
      }
    }),
    count: jest.fn().mockResolvedValue(0)
  };

  const mockFilter: jest.Mocked<Partial<FilterComposer<T>>> = {
    matches: jest.fn().mockImplementation((item, criteria) => {
      // Simple matching logic for tests
      if (!criteria) return true;
      for (const [key, value] of Object.entries(criteria)) {
        if (item[key] !== value) return false;
      }
      return true;
    }),
    filter: jest.fn().mockImplementation((data, criteria) => {
      return data.filter((item: any) => {
        if (!criteria) return true;
        for (const [key, value] of Object.entries(criteria)) {
          if (item[key] !== value) return false;
        }
        return true;
      });
    }),
    compose: jest.fn()
  };

  const mockIndex: jest.Mocked<Partial<IndexManager<T>>> = {
    createIndex: jest.fn(),
    buildIndex: jest.fn(),
    lookup: jest.fn().mockReturnValue(new Set()),
    getItems: jest.fn().mockReturnValue([]),
    addItem: jest.fn(),
    getIndexNames: jest.fn().mockReturnValue([]),
    getStatistics: jest.fn().mockReturnValue({
      totalKeys: 0,
      totalItems: 0,
      averageItemsPerKey: 0,
      buildTime: 0,
      memoryUsage: 0
    })
  };

  const mockStream: jest.Mocked<Partial<StreamProcessor<T>>> = {
    stream: jest.fn().mockImplementation(async function* () {
      yield {
        data: [],
        hasMore: false,
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          partitionId: 'test',
          itemCount: 0
        }
      };
    }),
    collect: jest.fn().mockResolvedValue([])
  };

  return {
    adapter: mockAdapter as any,
    manifestManager: mockManifest as any,
    cacheManager: mockCache as any,
    retryManager: mockRetry as any,
    mapReduceEngine: mockMapReduce as any,
    filterComposer: mockFilter as any,
    indexManager: mockIndex as any,
    streamProcessor: mockStream as any
  };
}

describe('DataLayer', () => {
  describe('initialization', () => {
    it('should initialize with default dependencies', async () => {
      const mockDeps = createMockDependencies();
      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();

      expect(mockDeps.adapter!.connect).toHaveBeenCalled();
      expect(mockDeps.manifestManager!.loadManifest).toHaveBeenCalled();
    });

    it('should create manifest if load fails', async () => {
      const mockDeps = createMockDependencies();
      mockDeps.manifestManager!.loadManifest = jest.fn().mockRejectedValue(new Error('Not found'));

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();

      expect(mockDeps.manifestManager!.createManifest).toHaveBeenCalledWith({
        collection: 'items',
        description: 'Data collection for items'
      });
    });

    it('should auto-discover partitions when enabled', async () => {
      const mockDeps = createMockDependencies();
      const layer = new DataLayer(
        { basePath: '/test', collection: 'items', autoDiscoverPartitions: true },
        mockDeps
      );

      await layer.initialize();

      expect(mockDeps.manifestManager!.discoverPartitions).toHaveBeenCalledWith('/test');
    });

    it('should not auto-discover when disabled', async () => {
      const mockDeps = createMockDependencies();
      const layer = new DataLayer(
        { basePath: '/test', collection: 'items', autoDiscoverPartitions: false },
        mockDeps
      );

      await layer.initialize();

      expect(mockDeps.manifestManager!.discoverPartitions).not.toHaveBeenCalled();
    });
  });

  describe('query with caching', () => {
    it('should return cached results when available', async () => {
      const mockDeps = createMockDependencies<any>();
      const cachedData = [{ id: '1', name: 'Cached' }];
      mockDeps.cacheManager!.get = jest.fn().mockReturnValue(cachedData);

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items', enableCaching: true },
        mockDeps
      );

      await layer.initialize();
      const result = await layer.query({ filters: { status: 'active' } });

      expect(result.data).toEqual(cachedData);
      expect(result.metadata.cacheHit).toBe(true);
      expect(mockDeps.mapReduceEngine!.execute).not.toHaveBeenCalled();
    });

    it('should execute query on cache miss', async () => {
      const mockDeps = createMockDependencies<any>();
      mockDeps.cacheManager!.get = jest.fn().mockReturnValue(undefined);

      const queryResults = [{ id: '1', name: 'Fresh' }];
      mockDeps.mapReduceEngine!.execute = jest.fn().mockResolvedValue({
        results: new Map([['result', queryResults]]),
        statistics: {
          itemsProcessed: 1,
          partitionsProcessed: 1,
          executionTime: 10,
          failures: 0,
          retries: 0
        }
      });

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items', enableCaching: true },
        mockDeps
      );

      await layer.initialize();
      const result = await layer.query({ filters: {} });

      expect(result.metadata.cacheHit).toBe(false);
      expect(mockDeps.cacheManager!.set).toHaveBeenCalled();
    });

    it('should not use cache when disabled', async () => {
      const mockDeps = createMockDependencies<any>();

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items', enableCaching: false },
        mockDeps
      );

      await layer.initialize();
      await layer.query({ filters: {} });

      expect(mockDeps.cacheManager!.get).not.toHaveBeenCalled();
    });
  });

  describe('query with retry', () => {
    it('should use retry manager for queries', async () => {
      const mockDeps = createMockDependencies<any>();

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      await layer.query({ filters: {} });

      expect(mockDeps.retryManager!.execute).toHaveBeenCalled();
    });

    it('should throw error when retry fails', async () => {
      const mockDeps = createMockDependencies<any>();
      mockDeps.retryManager!.execute = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('Query failed'),
        attempts: 4,
        totalDelay: 1000
      });

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();

      await expect(layer.query({ filters: {} })).rejects.toThrow('Query failed');
    });
  });

  describe('query with filtering', () => {
    it('should apply filters to query results', async () => {
      const mockDeps = createMockDependencies<any>();
      const items = [
        { id: '1', status: 'active' },
        { id: '2', status: 'inactive' }
      ];

      mockDeps.filterComposer!.matches = jest.fn().mockImplementation((item, filters) => {
        return item.status === 'active';
      });

      mockDeps.mapReduceEngine!.execute = jest.fn().mockImplementation(async (partitions, operation) => {
        const filtered = items.filter(item => operation.map(item).length > 0);
        return {
          results: new Map([['result', filtered]]),
          statistics: {
            itemsProcessed: items.length,
            partitionsProcessed: 1,
            executionTime: 5,
            failures: 0,
            retries: 0
          }
        };
      });

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items', enableCaching: false },
        mockDeps
      );

      await layer.initialize();
      const result = await layer.query({ filters: { status: 'active' } });

      expect(mockDeps.filterComposer!.matches).toHaveBeenCalled();
    });
  });

  describe('query with sorting and pagination', () => {
    it('should apply sorting to results', async () => {
      const mockDeps = createMockDependencies<any>();
      const items = [
        { id: '3', value: 30 },
        { id: '1', value: 10 },
        { id: '2', value: 20 }
      ];

      mockDeps.mapReduceEngine!.execute = jest.fn().mockResolvedValue({
        results: items,
        statistics: { itemsProcessed: 3, partitionsProcessed: 1, executionTime: 5, failures: 0, retries: 0 }
      });

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items', enableCaching: false },
        mockDeps
      );

      await layer.initialize();
      const result = await layer.query({
        filters: {},
        sort: { field: 'value', direction: 'asc' }
      });

      // Verify sorted
      expect(result.data[0].value).toBe(10);
      expect(result.data[1].value).toBe(20);
      expect(result.data[2].value).toBe(30);
    });

    it('should apply pagination to results', async () => {
      const mockDeps = createMockDependencies<any>();
      const items = Array.from({ length: 100 }, (_, i) => ({ id: String(i), value: i }));

      mockDeps.mapReduceEngine!.execute = jest.fn().mockResolvedValue({
        results: items,
        statistics: { itemsProcessed: 100, partitionsProcessed: 1, executionTime: 10, failures: 0, retries: 0 }
      });

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items', enableCaching: false },
        mockDeps
      );

      await layer.initialize();
      const result = await layer.query({
        filters: {},
        limit: 10,
        offset: 20
      });

      expect(result.data).toHaveLength(10);
      expect(result.data[0].value).toBe(20);
      expect(result.metadata.totalCount).toBe(100);
      expect(result.metadata.returnedCount).toBe(10);
    });
  });

  describe('mapReduce', () => {
    it('should delegate to mapReduce engine', async () => {
      const mockDeps = createMockDependencies<any>();
      mockDeps.manifestManager!.getAllPartitions = jest.fn().mockReturnValue([
        { id: 'p1', location: '/data/p1.jsonl', filters: {} }
      ]);

      const operation = {
        map: (item: any) => [['count', 1]],
        reduce: (key: string, values: number[]) => values.reduce((a, b) => a + b, 0)
      };

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      await layer.mapReduce(operation);

      expect(mockDeps.mapReduceEngine!.execute).toHaveBeenCalledWith(
        expect.any(Array),
        operation
      );
    });

    it('should support partition filtering', async () => {
      const mockDeps = createMockDependencies<any>();
      const partition1 = { id: 'p1', location: '/p1.jsonl', filters: {} };
      const partition2 = { id: 'p2', location: '/p2.jsonl', filters: {} };

      mockDeps.manifestManager!.getAllPartitions = jest.fn().mockReturnValue([partition1, partition2]);
      mockDeps.manifestManager!.getPartition = jest.fn().mockImplementation((id) => {
        return id === 'p1' ? partition1 : id === 'p2' ? partition2 : undefined;
      });

      const operation = {
        map: (item: any) => [['key', item]],
        reduce: (key: string, items: any[]) => items
      };

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      await layer.mapReduce(operation, ['p1']);

      expect(mockDeps.mapReduceEngine!.execute).toHaveBeenCalledWith(
        [partition1],
        operation
      );
    });
  });

  describe('stream', () => {
    it('should delegate to stream processor', async () => {
      const mockDeps = createMockDependencies<any>();
      mockDeps.manifestManager!.getAllPartitions = jest.fn().mockReturnValue([
        { id: 'p1', location: '/data/p1.jsonl', filters: {} }
      ]);

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();

      const chunks = [];
      for await (const chunk of layer.stream({ chunkSize: 100 })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('indexing', () => {
    it('should create index with specified fields', async () => {
      const mockDeps = createMockDependencies<any>();
      mockDeps.adapter!.read = jest.fn().mockResolvedValue([
        { id: '1', name: 'Alice', age: 30 }
      ]);

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      await layer.createIndex('ageIndex', ['age'], { unique: false });

      expect(mockDeps.indexManager!.createIndex).toHaveBeenCalledWith(
        'ageIndex',
        expect.objectContaining({ fields: ['age'] })
      );
      expect(mockDeps.indexManager!.buildIndex).toHaveBeenCalled();
    });
  });

  describe('CRUD operations', () => {
    it('should insert data and invalidate cache', async () => {
      const mockDeps = createMockDependencies<any>();
      const partition = { id: 'p1', location: '/data/p1.jsonl', filters: {} };

      mockDeps.manifestManager!.getAllPartitions = jest.fn().mockReturnValue([partition]);
      mockDeps.manifestManager!.getManifest = jest.fn().mockReturnValue({
        collection: 'test',
        version: '1.0',
        settings: { defaultPartition: 'p1' },
        partitions: [partition]
      });
      mockDeps.manifestManager!.getPartition = jest.fn().mockReturnValue(partition);

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      await layer.insert([{ id: '1', name: 'New Item' }]);

      expect(mockDeps.adapter!.write).toHaveBeenCalled();
    });

    it('should update data matching filter', async () => {
      const mockDeps = createMockDependencies<any>();
      const partition = { id: 'p1', location: '/data/p1.jsonl', filters: {} };
      const items = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'active' }
      ];

      mockDeps.manifestManager!.getAllPartitions = jest.fn().mockReturnValue([partition]);
      mockDeps.adapter!.read = jest.fn().mockResolvedValue(items);
      mockDeps.filterComposer!.filter = jest.fn().mockReturnValue([items[0]]);

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      const count = await layer.update({ status: 'pending' }, { status: 'active' });

      expect(mockDeps.adapter!.write).toHaveBeenCalled();
      expect(count).toBeGreaterThan(0);
    });

    it('should delete data matching filter', async () => {
      const mockDeps = createMockDependencies<any>();
      const partition = { id: 'p1', location: '/data/p1.jsonl', filters: {} };

      mockDeps.manifestManager!.getAllPartitions = jest.fn().mockReturnValue([partition]);

      // Mock adapter to return data with items to delete
      const items = [
        { id: '1', status: 'inactive' },
        { id: '2', status: 'active' },
        { id: '3', status: 'inactive' },
        { id: '4', status: 'active' },
        { id: '5', status: 'inactive' }
      ];
      mockDeps.adapter!.read = jest.fn().mockResolvedValue(items);
      mockDeps.adapter!.write = jest.fn().mockResolvedValue(undefined);

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      const count = await layer.delete({ status: 'inactive' });

      expect(count).toBe(3);
      expect(mockDeps.adapter!.write).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should count items without filter', async () => {
      const mockDeps = createMockDependencies<any>();

      // Mock streamProcessor to return test data
      const testData = Array.from({ length: 42 }, (_, i) => ({ id: i }));
      mockDeps.streamProcessor!.stream = jest.fn().mockImplementation(async function* () {
        yield {
          data: testData,
          hasMore: false,
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            partitionId: 'test',
            itemCount: testData.length
          }
        };
      });

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      const count = await layer.count();

      expect(count).toBe(42);
    });

    it('should count items with filter', async () => {
      const mockDeps = createMockDependencies<any>();

      // Mock streamProcessor to return test data
      const testData = [
        { id: 1, status: 'active' },
        { id: 2, status: 'active' },
        { id: 3, status: 'inactive' },
        { id: 4, status: 'active' },
        { id: 5, status: 'active' },
        { id: 6, status: 'active' }
      ];
      mockDeps.streamProcessor!.stream = jest.fn().mockImplementation(async function* () {
        yield {
          data: testData,
          hasMore: false,
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            partitionId: 'test',
            itemCount: testData.length
          }
        };
      });

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      const count = await layer.count({ status: 'active' });

      expect(count).toBe(5);
    });
  });

  describe('statistics', () => {
    it('should return layer statistics', async () => {
      const mockDeps = createMockDependencies<any>();
      mockDeps.manifestManager!.getAllPartitions = jest.fn().mockReturnValue([
        { id: 'p1', location: '/p1' },
        { id: 'p2', location: '/p2' }
      ]);

      // Mock streamProcessor to return test data
      const testData = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      mockDeps.streamProcessor!.stream = jest.fn().mockImplementation(async function* () {
        yield {
          data: testData,
          hasMore: false,
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            partitionId: 'test',
            itemCount: testData.length
          }
        };
      });

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      const stats = await layer.getStatistics();

      expect(stats.totalPartitions).toBe(2);
      expect(stats.totalItems).toBe(100);
    });
  });

  describe('cleanup', () => {
    it('should clear cache', async () => {
      const mockDeps = createMockDependencies<any>();

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      layer.clearCache();

      expect(mockDeps.cacheManager!.clear).toHaveBeenCalled();
    });

    it('should disconnect adapter', async () => {
      const mockDeps = createMockDependencies<any>();

      const layer = new DataLayer(
        { basePath: '/test', collection: 'items' },
        mockDeps
      );

      await layer.initialize();
      await layer.disconnect();

      expect(mockDeps.adapter!.disconnect).toHaveBeenCalled();
    });
  });
});
