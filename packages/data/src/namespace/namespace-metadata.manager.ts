/**
 * Namespace Metadata Manager
 *
 * Manages namespace.meta.json files for partition-based namespaces.
 * Handles creation, reading, updating, and validation of namespace metadata.
 */

import { join } from 'path';
import { JsonObjectStorage } from '../storage/json.storage';
import {
  NamespaceMetadata,
  PartitionInfo,
  PartitionSchemaConfig,
  PartitionFieldSchema
} from './namespace.types';
import { promises as fs } from 'fs';

export interface CreateNamespaceConfig {
  namespace: string;
  basePath: string;
  partitionSchema: PartitionSchemaConfig;
  dataFormat?: 'json' | 'jsonl';
  itemSchema?: object;
  custom?: Record<string, any>;
}

/**
 * Manages namespace metadata files
 */
export class NamespaceMetadataManager {
  private storage: JsonObjectStorage;

  constructor() {
    this.storage = new JsonObjectStorage();
  }

  /**
   * Create new namespace with metadata
   */
  async createNamespace(config: CreateNamespaceConfig): Promise<NamespaceMetadata> {
    const {
      namespace,
      basePath,
      partitionSchema,
      dataFormat = 'jsonl',
      itemSchema,
      custom
    } = config;

    // Validate partition schema
    this.validatePartitionSchema(partitionSchema);

    const namespacePath = join(basePath, namespace);
    const metaPath = join(namespacePath, 'namespace.meta.json');
    const dataPath = join(namespacePath, 'data');

    // Check if namespace already exists
    if (await this.storage.exists(metaPath)) {
      throw new Error(`Namespace '${namespace}' already exists at ${namespacePath}`);
    }

    // Create namespace directory structure
    await fs.mkdir(namespacePath, { recursive: true });
    await fs.mkdir(dataPath, { recursive: true });

    // Create metadata
    const metadata: NamespaceMetadata = {
      namespace,
      version: '1.0.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      partitionSchema,
      discoveredPartitions: [],
      dataFormat,
      itemSchema,
      custom
    };

    // Write metadata file
    await this.storage.write(metaPath, metadata, {
      pretty: true,
      createDirectories: true,
      overwrite: false
    });

    return metadata;
  }

  /**
   * Load namespace metadata
   */
  async loadMetadata(basePath: string, namespace: string): Promise<NamespaceMetadata> {
    const metaPath = this.getMetadataPath(basePath, namespace);

    try {
      return await this.storage.read(metaPath) as NamespaceMetadata;
    } catch (error) {
      throw new Error(`Failed to load namespace metadata for '${namespace}': ${error}`);
    }
  }

  /**
   * Save namespace metadata
   */
  async saveMetadata(
    basePath: string,
    namespace: string,
    metadata: NamespaceMetadata
  ): Promise<void> {
    const metaPath = this.getMetadataPath(basePath, namespace);

    // Update timestamp
    metadata.updated = new Date().toISOString();

    await this.storage.write(metaPath, metadata, {
      pretty: true,
      backup: true
    });
  }

  /**
   * Update partition schema
   */
  async updatePartitionSchema(
    basePath: string,
    namespace: string,
    partitionSchema: PartitionSchemaConfig
  ): Promise<NamespaceMetadata> {
    const metadata = await this.loadMetadata(basePath, namespace);

    // Validate new schema
    this.validatePartitionSchema(partitionSchema);

    metadata.partitionSchema = partitionSchema;

    await this.saveMetadata(basePath, namespace, metadata);

    return metadata;
  }

  /**
   * Add partition to discovered partitions
   */
  async addDiscoveredPartition(
    basePath: string,
    namespace: string,
    partitionInfo: PartitionInfo
  ): Promise<void> {
    const metadata = await this.loadMetadata(basePath, namespace);

    // Check if partition already exists
    const existingIndex = metadata.discoveredPartitions.findIndex(
      p => p.path === partitionInfo.path
    );

    if (existingIndex >= 0) {
      // Update existing partition
      metadata.discoveredPartitions[existingIndex] = partitionInfo;
    } else {
      // Add new partition
      metadata.discoveredPartitions.push(partitionInfo);
    }

    await this.saveMetadata(basePath, namespace, metadata);
  }

  /**
   * Remove partition from discovered partitions
   */
  async removeDiscoveredPartition(
    basePath: string,
    namespace: string,
    partitionPath: string
  ): Promise<void> {
    const metadata = await this.loadMetadata(basePath, namespace);

    metadata.discoveredPartitions = metadata.discoveredPartitions.filter(
      p => p.path !== partitionPath
    );

    await this.saveMetadata(basePath, namespace, metadata);
  }

  /**
   * Update partition info statistics
   */
  async updatePartitionInfo(
    basePath: string,
    namespace: string,
    partitionPath: string,
    updates: Partial<PartitionInfo>
  ): Promise<void> {
    const metadata = await this.loadMetadata(basePath, namespace);

    const partition = metadata.discoveredPartitions.find(p => p.path === partitionPath);

    if (!partition) {
      throw new Error(`Partition '${partitionPath}' not found in namespace '${namespace}'`);
    }

    Object.assign(partition, updates);
    partition.lastUpdated = new Date().toISOString();

    await this.saveMetadata(basePath, namespace, metadata);
  }

  /**
   * Discover partitions from filesystem
   */
  async discoverPartitions(
    basePath: string,
    namespace: string
  ): Promise<PartitionInfo[]> {
    const metadata = await this.loadMetadata(basePath, namespace);
    const dataPath = join(basePath, namespace, 'data');

    const discovered: PartitionInfo[] = [];
    const partitionOrder = metadata.partitionSchema.order;

    // Recursively walk partition hierarchy
    await this.walkPartitions(
      dataPath,
      partitionOrder,
      0,
      {},
      discovered,
      metadata.dataFormat
    );

    // Update metadata with discovered partitions
    metadata.discoveredPartitions = discovered;
    await this.saveMetadata(basePath, namespace, metadata);

    return discovered;
  }

  /**
   * Get metadata file path
   */
  private getMetadataPath(basePath: string, namespace: string): string {
    return join(basePath, namespace, 'namespace.meta.json');
  }

  /**
   * Validate partition schema
   */
  private validatePartitionSchema(schema: PartitionSchemaConfig): void {
    if (!schema.order || schema.order.length === 0) {
      throw new Error('Partition schema must define at least one partition in order');
    }

    for (const key of schema.order) {
      if (!schema.partitions[key]) {
        throw new Error(`Partition '${key}' is in order but not defined in partitions`);
      }

      const partition = schema.partitions[key];

      // Validate regex if provided
      if (partition.regex) {
        try {
          new RegExp(partition.regex);
        } catch (error) {
          throw new Error(`Invalid regex for partition '${key}': ${error}`);
        }
      }

      // Validate deriveFromData if provided
      if (partition.deriveFromData) {
        try {
          // Test that function string is valid
          new Function('item', `return ${partition.deriveFromData}`);
        } catch (error) {
          throw new Error(`Invalid deriveFromData function for partition '${key}': ${error}`);
        }
      }
    }
  }

  /**
   * Recursively walk partition hierarchy
   */
  private async walkPartitions(
    currentPath: string,
    partitionOrder: string[],
    depth: number,
    currentValues: Record<string, string>,
    discovered: PartitionInfo[],
    dataFormat: 'json' | 'jsonl'
  ): Promise<void> {
    // Base case: reached end of partition hierarchy
    if (depth >= partitionOrder.length) {
      // Look for data file
      const dataFile = dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json';
      const dataFilePath = join(currentPath, dataFile);

      try {
        const stats = await fs.stat(dataFilePath);

        // Calculate relative path from data/ directory
        const pathSegments = Object.entries(currentValues).map(
          ([key, value]) => `${key}=${value}`
        );
        const relativePath = pathSegments.join('/');

        // Count items (approximate for now)
        const itemCount = dataFormat === 'jsonl'
          ? await this.countLinesInFile(dataFilePath)
          : 0; // TODO: Count items in JSON file

        discovered.push({
          path: relativePath,
          values: { ...currentValues },
          created: stats.birthtime.toISOString(),
          itemCount,
          lastUpdated: stats.mtime.toISOString(),
          sizeBytes: stats.size
        });
      } catch (error) {
        // No data file at this partition, skip
      }

      return;
    }

    // Get current partition key
    const partitionKey = partitionOrder[depth];

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Parse partition value from directory name (format: key=value)
        const match = entry.name.match(/^(.+?)=(.+)$/);
        if (!match) continue;

        const [, key, value] = match;
        if (key !== partitionKey) continue;

        // Recurse into partition directory
        const nextPath = join(currentPath, entry.name);
        const nextValues = { ...currentValues, [key]: value };

        await this.walkPartitions(
          nextPath,
          partitionOrder,
          depth + 1,
          nextValues,
          discovered,
          dataFormat
        );
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      return;
    }
  }

  /**
   * Count lines in file (for JSONL)
   */
  private async countLinesInFile(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.split('\n').filter(line => line.trim().length > 0).length;
    } catch (error) {
      return 0;
    }
  }
}
