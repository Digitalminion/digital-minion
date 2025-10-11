/**
 * PartitionManifestManager Tests
 */

import { PartitionManifestManager, PartitionManifest, CreateManifestConfig } from '../partition-manifest.manager';
import { Partition } from '../data.types';
import { JsonObjectStorage } from '../../storage/json.storage';
import { promises as fs } from 'fs';

// Mock dependencies
jest.mock('../../storage/json.storage');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('PartitionManifestManager', () => {
  let manager: PartitionManifestManager<any>;
  let mockStorage: jest.Mocked<JsonObjectStorage>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock storage instance
    mockStorage = {
      read: jest.fn(),
      write: jest.fn(),
      exists: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      validate: jest.fn()
    } as any;

    // Mock the constructor to return our mock
    (JsonObjectStorage as jest.Mock).mockImplementation(() => mockStorage);

    manager = new PartitionManifestManager('/test/path', 'test-collection');
  });

  describe('loadManifest', () => {
    it('should load manifest from disk', async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        description: 'Test collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {
          defaultPartition: 'default',
          autoDiscoverPartitions: true
        },
        partitions: {}
      };

      mockStorage.read.mockResolvedValue(mockManifest);

      const result = await manager.loadManifest();

      expect(result).toEqual(mockManifest);
      expect(mockStorage.read).toHaveBeenCalledWith(expect.stringContaining('test-collection'));
    });

    it('should throw error if manifest load fails', async () => {
      mockStorage.read.mockRejectedValue(new Error('File not found'));

      await expect(manager.loadManifest()).rejects.toThrow(
        "Failed to load manifest for collection 'test-collection'"
      );
    });

    it('should store loaded manifest internally', async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {},
        partitions: {}
      };

      mockStorage.read.mockResolvedValue(mockManifest);
      await manager.loadManifest();

      // Should be able to call getManifest without error
      const result = manager.getManifest();
      expect(result).toEqual(mockManifest);
    });
  });

  describe('createManifest', () => {
    it('should create new manifest', async () => {
      const config: CreateManifestConfig = {
        collection: 'test-collection',
        description: 'Test description'
      };

      mockStorage.exists.mockResolvedValue(false);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockStorage.write.mockResolvedValue(undefined);

      const result = await manager.createManifest(config);

      expect(result.collection).toBe('test-collection');
      expect(result.description).toBe('Test description');
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
      expect(result.settings.autoDiscoverPartitions).toBe(true);
      expect(result.partitions).toEqual({});

      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('test-collection'), { recursive: true });
      expect(mockStorage.write).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        expect.objectContaining({ collection: 'test-collection' }),
        { pretty: true }
      );
    });

    it('should throw error if manifest already exists', async () => {
      mockStorage.exists.mockResolvedValue(true);

      const config: CreateManifestConfig = {
        collection: 'test-collection'
      };

      await expect(manager.createManifest(config)).rejects.toThrow(
        "Manifest for collection 'test-collection' already exists"
      );
    });

    it('should use default settings when not provided', async () => {
      const config: CreateManifestConfig = {
        collection: 'test-collection'
      };

      mockStorage.exists.mockResolvedValue(false);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockStorage.write.mockResolvedValue(undefined);

      const result = await manager.createManifest(config);

      expect(result.settings.autoDiscoverPartitions).toBe(true);
      expect(result.settings.defaultPartition).toBeUndefined();
    });

    it('should use custom settings when provided', async () => {
      const config: CreateManifestConfig = {
        collection: 'test-collection',
        settings: {
          defaultPartition: 'main',
          autoDiscoverPartitions: false
        }
      };

      mockStorage.exists.mockResolvedValue(false);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockStorage.write.mockResolvedValue(undefined);

      const result = await manager.createManifest(config);

      expect(result.settings.defaultPartition).toBe('main');
      expect(result.settings.autoDiscoverPartitions).toBe(false);
    });
  });

  describe('addPartition', () => {
    beforeEach(async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {},
        partitions: {}
      };

      mockStorage.read.mockResolvedValue(mockManifest);
      await manager.loadManifest();
    });

    it('should add partition to manifest', async () => {
      const partition: Partition<any> = {
        id: 'test-partition',
        name: 'Test Partition',
        type: 'file',
        location: '/test/path/data.jsonl',
        metadata: {
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z'
        }
      };

      mockStorage.write.mockResolvedValue(undefined);

      await manager.addPartition(partition);

      const manifest = manager.getManifest();
      expect(manifest.partitions['test-partition']).toEqual(partition);
      expect(mockStorage.write).toHaveBeenCalled();
    });

    it('should update timestamp when adding partition', async () => {
      const partition: Partition<any> = {
        id: 'test-partition',
        name: 'Test Partition',
        type: 'file',
        location: '/test/path/data.jsonl',
        metadata: {}
      };

      mockStorage.write.mockResolvedValue(undefined);
      const beforeUpdate = manager.getManifest().updated_at;

      await manager.addPartition(partition);

      const afterUpdate = manager.getManifest().updated_at;
      expect(afterUpdate).not.toBe(beforeUpdate);
    });

    it('should throw error if manifest not loaded', async () => {
      const freshManager = new PartitionManifestManager('/test', 'collection');
      const partition: Partition<any> = {
        id: 'test',
        name: 'Test',
        type: 'file',
        location: '/test/data.jsonl',
        metadata: {}
      };

      await expect(freshManager.addPartition(partition)).rejects.toThrow(
        'Manifest not loaded'
      );
    });
  });

  describe('removePartition', () => {
    beforeEach(async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {},
        partitions: {
          'partition-1': {
            id: 'partition-1',
            name: 'Partition 1',
            type: 'file',
            location: '/test/data1.jsonl',
            metadata: {}
          }
        }
      };

      mockStorage.read.mockResolvedValue(mockManifest);
      await manager.loadManifest();
    });

    it('should remove partition from manifest', async () => {
      mockStorage.write.mockResolvedValue(undefined);

      await manager.removePartition('partition-1');

      const manifest = manager.getManifest();
      expect(manifest.partitions['partition-1']).toBeUndefined();
      expect(mockStorage.write).toHaveBeenCalled();
    });

    it('should update timestamp when removing partition', async () => {
      mockStorage.write.mockResolvedValue(undefined);
      const beforeUpdate = manager.getManifest().updated_at;

      await manager.removePartition('partition-1');

      const afterUpdate = manager.getManifest().updated_at;
      expect(afterUpdate).not.toBe(beforeUpdate);
    });

    it('should throw error if manifest not loaded', async () => {
      const freshManager = new PartitionManifestManager('/test', 'collection');

      await expect(freshManager.removePartition('test')).rejects.toThrow(
        'Manifest not loaded'
      );
    });
  });

  describe('getPartition', () => {
    beforeEach(async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {},
        partitions: {
          'partition-1': {
            id: 'partition-1',
            name: 'Partition 1',
            type: 'file',
            location: '/test/data1.jsonl',
            metadata: {}
          }
        }
      };

      mockStorage.read.mockResolvedValue(mockManifest);
      await manager.loadManifest();
    });

    it('should return partition by ID', () => {
      const partition = manager.getPartition('partition-1');

      expect(partition).toBeDefined();
      expect(partition!.id).toBe('partition-1');
      expect(partition!.name).toBe('Partition 1');
    });

    it('should return undefined for non-existent partition', () => {
      const partition = manager.getPartition('non-existent');

      expect(partition).toBeUndefined();
    });

    it('should throw error if manifest not loaded', () => {
      const freshManager = new PartitionManifestManager('/test', 'collection');

      expect(() => freshManager.getPartition('test')).toThrow('Manifest not loaded');
    });
  });

  describe('getAllPartitions', () => {
    beforeEach(async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {},
        partitions: {
          'partition-1': {
            id: 'partition-1',
            name: 'Partition 1',
            type: 'file',
            location: '/test/data1.jsonl',
            metadata: {}
          },
          'partition-2': {
            id: 'partition-2',
            name: 'Partition 2',
            type: 'file',
            location: '/test/data2.jsonl',
            metadata: {}
          }
        }
      };

      mockStorage.read.mockResolvedValue(mockManifest);
      await manager.loadManifest();
    });

    it('should return all partitions', () => {
      const partitions = manager.getAllPartitions();

      expect(partitions).toHaveLength(2);
      expect(partitions[0].id).toBe('partition-1');
      expect(partitions[1].id).toBe('partition-2');
    });

    it('should return empty array when no partitions', async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {},
        partitions: {}
      };

      mockStorage.read.mockResolvedValue(mockManifest);
      const freshManager = new PartitionManifestManager('/test', 'collection');
      await freshManager.loadManifest();

      const partitions = freshManager.getAllPartitions();
      expect(partitions).toHaveLength(0);
    });

    it('should throw error if manifest not loaded', () => {
      const freshManager = new PartitionManifestManager('/test', 'collection');

      expect(() => freshManager.getAllPartitions()).toThrow('Manifest not loaded');
    });
  });

  describe('getManifest', () => {
    it('should return manifest', async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {},
        partitions: {}
      };

      mockStorage.read.mockResolvedValue(mockManifest);
      await manager.loadManifest();

      const result = manager.getManifest();
      expect(result).toEqual(mockManifest);
    });

    it('should throw error if manifest not loaded', () => {
      const freshManager = new PartitionManifestManager('/test', 'collection');

      expect(() => freshManager.getManifest()).toThrow('Manifest not loaded');
    });
  });

  describe('discoverPartitions', () => {
    beforeEach(async () => {
      const mockManifest: PartitionManifest = {
        collection: 'test-collection',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        settings: {},
        partitions: {}
      };

      mockStorage.read.mockResolvedValue(mockManifest);
      await manager.loadManifest();
    });

    it('should discover partitions from filesystem', async () => {
      const mockDirents = [
        { name: 'partition-1', isDirectory: () => true },
        { name: 'partition-2', isDirectory: () => true },
        { name: 'manifest.json', isDirectory: () => false }
      ];

      mockFs.readdir
        .mockResolvedValueOnce(mockDirents as any)
        .mockResolvedValueOnce(['data.jsonl'] as any)
        .mockResolvedValueOnce(['data.jsonl'] as any);

      mockStorage.write.mockResolvedValue(undefined);

      await manager.discoverPartitions('/test/path');

      const partitions = manager.getAllPartitions();
      expect(partitions).toHaveLength(2);
      expect(partitions[0].id).toBe('partition-1');
      expect(partitions[1].id).toBe('partition-2');
      expect(mockStorage.write).toHaveBeenCalled();
    });

    it('should skip manifest.json file', async () => {
      const mockDirents = [
        { name: 'manifest.json', isDirectory: () => false },
        { name: 'partition-1', isDirectory: () => true }
      ];

      mockFs.readdir
        .mockResolvedValueOnce(mockDirents as any)
        .mockResolvedValueOnce(['data.jsonl'] as any);

      mockStorage.write.mockResolvedValue(undefined);

      await manager.discoverPartitions('/test/path');

      const partitions = manager.getAllPartitions();
      expect(partitions).toHaveLength(1);
      expect(partitions[0].id).toBe('partition-1');
    });

    it('should skip non-directory entries', async () => {
      const mockDirents = [
        { name: 'file.txt', isDirectory: () => false },
        { name: 'partition-1', isDirectory: () => true }
      ];

      mockFs.readdir
        .mockResolvedValueOnce(mockDirents as any)
        .mockResolvedValueOnce(['data.jsonl'] as any);

      mockStorage.write.mockResolvedValue(undefined);

      await manager.discoverPartitions('/test/path');

      const partitions = manager.getAllPartitions();
      expect(partitions).toHaveLength(1);
    });

    it('should skip existing partitions', async () => {
      // Add existing partition
      const existingPartition: Partition<any> = {
        id: 'partition-1',
        name: 'Existing',
        type: 'file',
        location: '/old/location.jsonl',
        metadata: {}
      };

      mockStorage.write.mockResolvedValue(undefined);
      await manager.addPartition(existingPartition);

      const mockDirents = [
        { name: 'partition-1', isDirectory: () => true },
        { name: 'partition-2', isDirectory: () => true }
      ];

      mockFs.readdir
        .mockResolvedValueOnce(mockDirents as any)
        .mockResolvedValueOnce(['data.jsonl'] as any);

      await manager.discoverPartitions('/test/path');

      const partitions = manager.getAllPartitions();
      expect(partitions).toHaveLength(2);
      // Should keep existing partition location
      expect(partitions.find(p => p.id === 'partition-1')!.location).toBe('/old/location.jsonl');
    });

    it('should skip directories without data files', async () => {
      const mockDirents = [
        { name: 'partition-1', isDirectory: () => true },
        { name: 'partition-2', isDirectory: () => true }
      ];

      mockFs.readdir
        .mockResolvedValueOnce(mockDirents as any)
        .mockResolvedValueOnce(['readme.txt'] as any) // No data file
        .mockResolvedValueOnce(['data.json'] as any); // Has data file

      mockStorage.write.mockResolvedValue(undefined);

      await manager.discoverPartitions('/test/path');

      const partitions = manager.getAllPartitions();
      expect(partitions).toHaveLength(1);
      expect(partitions[0].id).toBe('partition-2');
    });

    it('should handle .json and .jsonl files', async () => {
      const mockDirents = [
        { name: 'partition-1', isDirectory: () => true },
        { name: 'partition-2', isDirectory: () => true }
      ];

      mockFs.readdir
        .mockResolvedValueOnce(mockDirents as any)
        .mockResolvedValueOnce(['data.json'] as any)
        .mockResolvedValueOnce(['data.jsonl'] as any);

      mockStorage.write.mockResolvedValue(undefined);

      await manager.discoverPartitions('/test/path');

      const partitions = manager.getAllPartitions();
      expect(partitions).toHaveLength(2);
      expect(partitions[0].location).toContain('data.json');
      expect(partitions[1].location).toContain('data.jsonl');
    });

    it('should throw error on filesystem failure', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      await expect(manager.discoverPartitions('/test/path')).rejects.toThrow(
        'Failed to discover partitions'
      );
    });

    it('should throw error if manifest not loaded', async () => {
      const freshManager = new PartitionManifestManager('/test', 'collection');

      await expect(freshManager.discoverPartitions('/test')).rejects.toThrow(
        'Manifest not loaded'
      );
    });
  });
});
