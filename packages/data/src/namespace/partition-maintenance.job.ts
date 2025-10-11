/**
 * Partition Maintenance Job
 *
 * Handles map-reduce operations for partition restructuring:
 * - Split: Add new partition level and reorganize data
 * - Merge: Remove partition level and consolidate data
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { JsonlRowStorage } from '../storage/jsonl.storage';
import { JsonObjectStorage } from '../storage/json.storage';
import { NamespaceMetadataManager } from './namespace-metadata.manager';
import {
  MaintenanceJobResult,
  MaintenanceJobError,
  AddPartitionConfig,
  PartitionInfo,
  NamespaceMetadata
} from './namespace.types';

export interface SplitJobConfig {
  namespace: string;
  operation: 'split';
  partitionKey: string;
  config: AddPartitionConfig;
  dryRun?: boolean;
  parallel?: boolean;
}

export interface MergeJobConfig {
  namespace: string;
  operation: 'merge';
  partitionKey: string;
  dryRun?: boolean;
  parallel?: boolean;
}

type JobConfig = SplitJobConfig | MergeJobConfig;

/**
 * Manages partition maintenance operations
 */
export class PartitionMaintenanceJob {
  private basePath: string;
  private metadataManager: NamespaceMetadataManager;
  private jsonlStorage: JsonlRowStorage;
  private jsonStorage: JsonObjectStorage;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.metadataManager = new NamespaceMetadataManager();
    this.jsonlStorage = new JsonlRowStorage();
    this.jsonStorage = new JsonObjectStorage();
  }

  /**
   * Split partition - add new partition level and reorganize data
   */
  async splitPartition(config: SplitJobConfig): Promise<MaintenanceJobResult> {
    const startTime = Date.now();
    const errors: MaintenanceJobError[] = [];

    try {
      // Load metadata
      const metadata = await this.metadataManager.loadMetadata(
        this.basePath,
        config.namespace
      );

      const { config: partitionConfig } = config;

      // Compile derive function
      const deriveFn = new Function('item', `return ${partitionConfig.deriveFromData}`) as (
        item: any
      ) => any;

      // Get all existing partitions
      const existingPartitions = metadata.discoveredPartitions;
      let itemsProcessed = 0;
      let partitionsProcessed = 0;
      let partitionsCreated = 0;
      const newPartitionPaths = new Set<string>();

      // Process each existing partition
      for (const partition of existingPartitions) {
        try {
          partitionsProcessed++;

          // Read data from partition
          const filePath = join(
            this.basePath,
            config.namespace,
            'data',
            partition.path,
            metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json'
          );

          const items = await this.readDataFile(filePath, metadata.dataFormat);

          // Map phase: Group items by new partition value
          const partitionGroups = new Map<string, any[]>();

          for (const item of items) {
            itemsProcessed++;

            // Derive partition value
            let partitionValue: any;
            try {
              partitionValue = deriveFn(item);
            } catch (error) {
              errors.push({
                partition: partition.path,
                error: `Failed to derive partition value: ${error}`,
                recoverable: true
              });
              continue;
            }

            // Validate partition value
            if (partitionConfig.regex) {
              const regex = new RegExp(partitionConfig.regex);
              if (!regex.test(String(partitionValue))) {
                errors.push({
                  partition: partition.path,
                  error: `Derived value '${partitionValue}' does not match regex '${partitionConfig.regex}'`,
                  recoverable: true
                });
                continue;
              }
            }

            // Build new partition path
            const newPath = this.insertPartitionInPath(
              partition.path,
              partitionConfig.key,
              partitionValue,
              partitionConfig.position
            );

            if (!partitionGroups.has(newPath)) {
              partitionGroups.set(newPath, []);
            }

            partitionGroups.get(newPath)!.push(item);
          }

          // Reduce phase: Write items to new partitions
          if (!config.dryRun) {
            for (const [newPath, groupItems] of partitionGroups.entries()) {
              const newFilePath = join(
                this.basePath,
                config.namespace,
                'data',
                newPath,
                metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json'
              );

              // Create directory
              await fs.mkdir(join(this.basePath, config.namespace, 'data', newPath), {
                recursive: true
              });

              // Write data
              await this.writeDataFile(newFilePath, groupItems, metadata.dataFormat);
              newPartitionPaths.add(newPath);
              partitionsCreated++;
            }

            // Delete old partition file
            await fs.unlink(filePath);
          }
        } catch (error) {
          errors.push({
            partition: partition.path,
            error: `Failed to process partition: ${error}`,
            recoverable: false
          });
        }
      }

      // Update metadata if not dry run
      if (!config.dryRun) {
        // Update partition schema
        const newOrder = [...metadata.partitionSchema.order];
        newOrder.splice(partitionConfig.position, 0, partitionConfig.key);

        metadata.partitionSchema.order = newOrder;
        metadata.partitionSchema.partitions[partitionConfig.key] = {
          type: partitionConfig.type,
          regex: partitionConfig.regex,
          required: partitionConfig.required,
          defaultValue: partitionConfig.defaultValue,
          description: partitionConfig.description,
          deriveFromData: partitionConfig.deriveFromData
        };

        // Rediscover partitions
        await this.metadataManager.saveMetadata(
          this.basePath,
          config.namespace,
          metadata
        );

        await this.metadataManager.discoverPartitions(this.basePath, config.namespace);
      }

      return {
        success: errors.filter(e => !e.recoverable).length === 0,
        operation: 'split',
        partitionsProcessed,
        itemsProcessed,
        partitionsCreated,
        partitionsDeleted: config.dryRun ? 0 : existingPartitions.length,
        executionTime: Date.now() - startTime,
        errors
      };
    } catch (error) {
      return {
        success: false,
        operation: 'split',
        partitionsProcessed: 0,
        itemsProcessed: 0,
        partitionsCreated: 0,
        partitionsDeleted: 0,
        executionTime: Date.now() - startTime,
        errors: [
          {
            partition: 'all',
            error: `Job failed: ${error}`,
            recoverable: false
          }
        ]
      };
    }
  }

  /**
   * Merge partition - remove partition level and consolidate data
   */
  async mergePartition(config: MergeJobConfig): Promise<MaintenanceJobResult> {
    const startTime = Date.now();
    const errors: MaintenanceJobError[] = [];

    try {
      // Load metadata
      const metadata = await this.metadataManager.loadMetadata(
        this.basePath,
        config.namespace
      );

      // Find position of partition to remove
      const position = metadata.partitionSchema.order.indexOf(config.partitionKey);
      if (position === -1) {
        throw new Error(`Partition '${config.partitionKey}' not found in schema`);
      }

      // Get all existing partitions
      const existingPartitions = metadata.discoveredPartitions;
      let itemsProcessed = 0;
      let partitionsProcessed = 0;
      let partitionsCreated = 0;

      // Group partitions by collapsed path
      const mergeGroups = new Map<string, PartitionInfo[]>();

      for (const partition of existingPartitions) {
        const collapsedPath = this.removePartitionFromPath(
          partition.path,
          config.partitionKey,
          position
        );

        if (!mergeGroups.has(collapsedPath)) {
          mergeGroups.set(collapsedPath, []);
        }

        mergeGroups.get(collapsedPath)!.push(partition);
      }

      // Process each merge group
      for (const [collapsedPath, partitions] of mergeGroups.entries()) {
        try {
          partitionsProcessed += partitions.length;

          // Read all items from partitions in group
          const allItems: any[] = [];

          for (const partition of partitions) {
            const filePath = join(
              this.basePath,
              config.namespace,
              'data',
              partition.path,
              metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json'
            );

            const items = await this.readDataFile(filePath, metadata.dataFormat);
            allItems.push(...items);
            itemsProcessed += items.length;
          }

          // Write consolidated data
          if (!config.dryRun) {
            const collapsedFilePath = join(
              this.basePath,
              config.namespace,
              'data',
              collapsedPath,
              metadata.dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json'
            );

            // Create directory
            await fs.mkdir(join(this.basePath, config.namespace, 'data', collapsedPath), {
              recursive: true
            });

            // Write data
            await this.writeDataFile(collapsedFilePath, allItems, metadata.dataFormat);
            partitionsCreated++;

            // Delete old partition files and directories
            for (const partition of partitions) {
              const oldDir = join(this.basePath, config.namespace, 'data', partition.path);
              await fs.rm(oldDir, { recursive: true, force: true });
            }
          }
        } catch (error) {
          errors.push({
            partition: collapsedPath,
            error: `Failed to merge partitions: ${error}`,
            recoverable: false
          });
        }
      }

      // Update metadata if not dry run
      if (!config.dryRun) {
        // Update partition schema
        const newOrder = metadata.partitionSchema.order.filter(
          key => key !== config.partitionKey
        );

        metadata.partitionSchema.order = newOrder;
        delete metadata.partitionSchema.partitions[config.partitionKey];

        // Save and rediscover partitions
        await this.metadataManager.saveMetadata(
          this.basePath,
          config.namespace,
          metadata
        );

        await this.metadataManager.discoverPartitions(this.basePath, config.namespace);
      }

      return {
        success: errors.filter(e => !e.recoverable).length === 0,
        operation: 'merge',
        partitionsProcessed,
        itemsProcessed,
        partitionsCreated,
        partitionsDeleted: config.dryRun ? 0 : partitionsProcessed,
        executionTime: Date.now() - startTime,
        errors
      };
    } catch (error) {
      return {
        success: false,
        operation: 'merge',
        partitionsProcessed: 0,
        itemsProcessed: 0,
        partitionsCreated: 0,
        partitionsDeleted: 0,
        executionTime: Date.now() - startTime,
        errors: [
          {
            partition: 'all',
            error: `Job failed: ${error}`,
            recoverable: false
          }
        ]
      };
    }
  }

  /**
   * Read data file (JSONL or JSON)
   */
  private async readDataFile(filePath: string, format: 'json' | 'jsonl'): Promise<any[]> {
    if (format === 'jsonl') {
      return this.jsonlStorage.readAll(filePath);
    } else {
      const data = await this.jsonStorage.read(filePath) as any[];
      return Array.isArray(data) ? data : [];
    }
  }

  /**
   * Write data file (JSONL or JSON)
   */
  private async writeDataFile(
    filePath: string,
    items: any[],
    format: 'json' | 'jsonl'
  ): Promise<void> {
    if (format === 'jsonl') {
      await this.jsonlStorage.writeAll(filePath, items);
    } else {
      await this.jsonStorage.write(filePath, items, { pretty: true });
    }
  }

  /**
   * Insert partition segment into path at position
   */
  private insertPartitionInPath(
    originalPath: string,
    key: string,
    value: any,
    position: number
  ): string {
    const segments = originalPath ? originalPath.split('/') : [];
    const newSegment = `${key}=${value}`;
    segments.splice(position, 0, newSegment);
    return segments.join('/');
  }

  /**
   * Remove partition segment from path at position
   */
  private removePartitionFromPath(
    originalPath: string,
    key: string,
    position: number
  ): string {
    const segments = originalPath.split('/');
    segments.splice(position, 1);
    return segments.join('/');
  }
}
