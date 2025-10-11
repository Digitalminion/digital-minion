/**
 * Partition Manifest Manager
 *
 * Manages a simple manifest file that tracks partitions for a collection.
 * This is a lightweight alternative to the full Namespace system for cases
 * where you just need basic partition tracking without hierarchical schemas.
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { JsonObjectStorage } from '../storage/json.storage';
import { Partition, PartitionMetadata } from './data.types';

/**
 * Manifest file structure
 */
export interface PartitionManifest {
  collection: string;
  description?: string;
  created_at: string;
  updated_at: string;
  settings: {
    defaultPartition?: string;
    autoDiscoverPartitions?: boolean;
  };
  partitions: Record<string, Partition<any>>;
}

/**
 * Configuration for creating a new manifest
 */
export interface CreateManifestConfig {
  collection: string;
  description?: string;
  settings?: {
    defaultPartition?: string;
    autoDiscoverPartitions?: boolean;
  };
}

/**
 * Manages partition manifest files
 */
export class PartitionManifestManager<T = any> {
  private basePath: string;
  private collection: string;
  private storage: JsonObjectStorage;
  private manifest: PartitionManifest | null = null;

  constructor(basePath: string, collection: string) {
    this.basePath = basePath;
    this.collection = collection;
    this.storage = new JsonObjectStorage();
  }

  /**
   * Get manifest file path
   */
  private getManifestPath(): string {
    return join(this.basePath, this.collection, 'manifest.json');
  }

  /**
   * Load manifest from disk
   */
  async loadManifest(): Promise<PartitionManifest> {
    const manifestPath = this.getManifestPath();

    try {
      this.manifest = await this.storage.read(manifestPath) as PartitionManifest;
      return this.manifest;
    } catch (error) {
      throw new Error(`Failed to load manifest for collection '${this.collection}': ${error}`);
    }
  }

  /**
   * Create new manifest
   */
  async createManifest(config: CreateManifestConfig): Promise<PartitionManifest> {
    const manifestPath = this.getManifestPath();
    const collectionPath = join(this.basePath, this.collection);

    // Check if manifest already exists
    if (await this.storage.exists(manifestPath)) {
      throw new Error(`Manifest for collection '${this.collection}' already exists`);
    }

    // Create collection directory
    await fs.mkdir(collectionPath, { recursive: true });

    // Create manifest
    this.manifest = {
      collection: config.collection,
      description: config.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      settings: {
        defaultPartition: config.settings?.defaultPartition,
        autoDiscoverPartitions: config.settings?.autoDiscoverPartitions ?? true
      },
      partitions: {}
    };

    await this.storage.write(manifestPath, this.manifest, { pretty: true });

    return this.manifest;
  }

  /**
   * Add partition to manifest
   */
  async addPartition(partition: Partition<T>): Promise<void> {
    this.ensureManifestLoaded();

    this.manifest!.partitions[partition.id] = partition;
    this.manifest!.updated_at = new Date().toISOString();

    await this.saveManifest();
  }

  /**
   * Remove partition from manifest
   */
  async removePartition(partitionId: string): Promise<void> {
    this.ensureManifestLoaded();

    delete this.manifest!.partitions[partitionId];
    this.manifest!.updated_at = new Date().toISOString();

    await this.saveManifest();
  }

  /**
   * Get partition by ID
   */
  getPartition(partitionId: string): Partition<T> | undefined {
    this.ensureManifestLoaded();
    return this.manifest!.partitions[partitionId] as Partition<T> | undefined;
  }

  /**
   * Get all partitions
   */
  getAllPartitions(): Partition<T>[] {
    this.ensureManifestLoaded();
    return Object.values(this.manifest!.partitions) as Partition<T>[];
  }

  /**
   * Get manifest
   */
  getManifest(): PartitionManifest {
    this.ensureManifestLoaded();
    return this.manifest!;
  }

  /**
   * Auto-discover partitions by scanning filesystem
   */
  async discoverPartitions(basePath: string): Promise<void> {
    this.ensureManifestLoaded();

    const collectionPath = join(basePath, this.collection);

    try {
      const entries = await fs.readdir(collectionPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip manifest file and non-directories
        if (entry.name === 'manifest.json' || !entry.isDirectory()) {
          continue;
        }

        const partitionId = entry.name;

        // Skip if partition already exists
        if (this.manifest!.partitions[partitionId]) {
          continue;
        }

        // Determine partition type and location
        const partitionPath = join(collectionPath, entry.name);
        const files = await fs.readdir(partitionPath);

        // Look for data files
        const dataFile = files.find(f => f.endsWith('.jsonl') || f.endsWith('.json'));

        if (dataFile) {
          const partition: Partition<T> = {
            id: partitionId,
            name: partitionId,
            type: 'file',
            location: join(partitionPath, dataFile),
            metadata: {
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          };

          this.manifest!.partitions[partitionId] = partition;
        }
      }

      this.manifest!.updated_at = new Date().toISOString();
      await this.saveManifest();
    } catch (error) {
      throw new Error(`Failed to discover partitions: ${error}`);
    }
  }

  /**
   * Save manifest to disk
   */
  private async saveManifest(): Promise<void> {
    const manifestPath = this.getManifestPath();
    await this.storage.write(manifestPath, this.manifest!, { pretty: true });
  }

  /**
   * Ensure manifest is loaded
   */
  private ensureManifestLoaded(): void {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call loadManifest() or createManifest() first.');
    }
  }
}
