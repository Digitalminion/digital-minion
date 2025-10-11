/**
 * Namespace Manager - Refactored
 *
 * Clean facade over specialized services:
 * - NamespaceValidationService: Item validation
 * - PartitionResolverService: Partition path resolution
 * - PartitionMaintenanceJob: Partition restructuring
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { NamespaceMetadataManager } from './namespace-metadata.manager';
import { PartitionMaintenanceJob } from './partition-maintenance.job';
import { NamespaceValidationService } from './services/validation.service';
import { PartitionResolverService } from './services/partition-resolver.service';
import {
  NamespaceMetadata,
  PartitionValidationResult,
  AddPartitionConfig,
  NamespaceQueryOptions,
  PartitionInfo,
  MaintenanceJobResult
} from './namespace.types';

export interface NamespaceManagerConfig {
  basePath: string;
}

/**
 * Manages namespace operations
 */
export class NamespaceManager {
  private config: NamespaceManagerConfig;
  private metadataManager: NamespaceMetadataManager;
  private maintenanceJob: PartitionMaintenanceJob;
  private validationService: NamespaceValidationService;
  private partitionResolver: PartitionResolverService;

  constructor(config: NamespaceManagerConfig) {
    this.config = config;
    this.metadataManager = new NamespaceMetadataManager();
    this.maintenanceJob = new PartitionMaintenanceJob(config.basePath);
    this.validationService = new NamespaceValidationService();
    this.partitionResolver = new PartitionResolverService(config.basePath);
  }

  /**
   * Validate item for writing to namespace
   */
  async validateWrite(
    namespace: string,
    item: any
  ): Promise<PartitionValidationResult> {
    const metadata = await this.metadataManager.loadMetadata(
      this.config.basePath,
      namespace
    );

    // Delegate validation to service
    const result = await this.validationService.validateWrite(metadata, item);

    // Generate partition path if validation passed
    if (result.isValid && result.partitionValues) {
      const partitionPath = this.buildPartitionPath(
        metadata.partitionSchema.order,
        result.partitionValues
      );
      return {
        ...result,
        partitionPath
      };
    }

    return result;
  }

  /**
   * Get partition path for item
   */
  async getPartitionPath(namespace: string, item: any): Promise<string> {
    const metadata = await this.metadataManager.loadMetadata(
      this.config.basePath,
      namespace
    );

    // Validate first
    const result = await this.validationService.validateWrite(metadata, item);
    if (!result.isValid) {
      throw new Error(`Item validation failed: ${result.errors.map(e => e.message).join(', ')}`);
    }

    // Build path from validated partition values
    if (result.partitionValues) {
      return this.buildPartitionPath(
        metadata.partitionSchema.order,
        result.partitionValues
      );
    }

    throw new Error('No partition values available');
  }

  /**
   * Resolve partition paths for query
   */
  async resolveQueryPartitions(
    namespace: string,
    options: NamespaceQueryOptions = {}
  ): Promise<string[]> {
    const metadata = await this.metadataManager.loadMetadata(
      this.config.basePath,
      namespace
    );

    // Use discovered partitions from metadata
    let partitions = metadata.discoveredPartitions || [];

    // Filter if partitionFilter is provided
    if (options.partitionFilter) {
      partitions = partitions.filter(partition =>
        this.partitionMatchesFilter(partition.values, options.partitionFilter!)
      );
    }

    return partitions.map(p => p.path);
  }

  /**
   * Get full filesystem path for partition
   */
  getPartitionFilePath(
    namespace: string,
    partitionPath: string,
    dataFormat: 'json' | 'jsonl' = 'jsonl'
  ): string {
    const dataFile = dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json';
    return join(this.config.basePath, namespace, 'data', partitionPath, dataFile);
  }

  /**
   * Add new partition level (triggers maintenance job)
   */
  async addPartition(
    namespace: string,
    config: AddPartitionConfig
  ): Promise<MaintenanceJobResult> {
    const metadata = await this.metadataManager.loadMetadata(
      this.config.basePath,
      namespace
    );

    // Validate configuration
    this.validateAddPartitionConfig(config, metadata);

    // Execute split maintenance job
    return this.maintenanceJob.splitPartition({
      namespace,
      operation: 'split',
      partitionKey: config.key,
      config
    });
  }

  /**
   * Collapse/remove partition level (triggers maintenance job)
   */
  async collapsePartition(
    namespace: string,
    partitionKey: string
  ): Promise<MaintenanceJobResult> {
    const metadata = await this.metadataManager.loadMetadata(
      this.config.basePath,
      namespace
    );

    // Validate that partition exists
    if (!metadata.partitionSchema.order.includes(partitionKey)) {
      throw new Error(`Partition '${partitionKey}' does not exist in namespace '${namespace}'`);
    }

    // Execute merge maintenance job
    return this.maintenanceJob.mergePartition({
      namespace,
      operation: 'merge',
      partitionKey
    });
  }

  /**
   * Ensure partition directory exists
   */
  async ensurePartitionExists(
    namespace: string,
    partitionPath: string,
    dataFormat: 'json' | 'jsonl' = 'jsonl'
  ): Promise<void> {
    const fullPath = join(this.config.basePath, namespace, 'data', partitionPath);

    // Create directory
    await fs.mkdir(fullPath, { recursive: true });

    // Create empty data file if it doesn't exist
    const dataFile = dataFormat === 'jsonl' ? 'data.jsonl' : 'data.json';
    const dataFilePath = join(fullPath, dataFile);

    try {
      await fs.access(dataFilePath);
    } catch {
      // File doesn't exist, create it
      const initialContent = dataFormat === 'jsonl' ? '' : '[]';
      await fs.writeFile(dataFilePath, initialContent, 'utf-8');
    }

    // Update discovered partitions
    const metadata = await this.metadataManager.loadMetadata(
      this.config.basePath,
      namespace
    );

    const partitionValues = this.parsePartitionPath(partitionPath);
    const stats = await fs.stat(dataFilePath);

    const partitionInfo: PartitionInfo = {
      path: partitionPath,
      values: partitionValues,
      created: stats.birthtime.toISOString(),
      itemCount: 0,
      lastUpdated: stats.mtime.toISOString(),
      sizeBytes: stats.size
    };

    await this.metadataManager.addDiscoveredPartition(
      this.config.basePath,
      namespace,
      partitionInfo
    );
  }

  /**
   * Build partition path from values (skip undefined/missing optional fields)
   */
  private buildPartitionPath(
    partitionKeys: string[],
    values: Record<string, string>
  ): string {
    const parts: string[] = [];

    for (const key of partitionKeys) {
      const value = values[key];
      // Skip undefined/missing optional fields
      if (value !== undefined && value !== 'undefined') {
        parts.push(`${key}=${value}`);
      }
    }

    return parts.join('/');
  }

  /**
   * Check if partition matches filter
   */
  private partitionMatchesFilter(
    partitionValues: Record<string, string>,
    filter: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      const partitionValue = partitionValues[key];

      if (!partitionValue) {
        continue; // Filter on non-partition field
      }

      if (Array.isArray(value)) {
        if (!value.includes(partitionValue)) {
          return false;
        }
      } else if (partitionValue !== String(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract partition values from item
   */
  private extractPartitionValues(
    metadata: NamespaceMetadata,
    item: any
  ): Record<string, any> {
    const values: Record<string, any> = {};

    for (const key of metadata.partitionSchema.order) {
      if (key in item) {
        values[key] = item[key];
      }
    }

    return values;
  }

  /**
   * Parse partition path into values
   */
  private parsePartitionPath(partitionPath: string): Record<string, string> {
    const values: Record<string, string> = {};
    const segments = partitionPath.split('/');

    for (const segment of segments) {
      const match = segment.match(/^(.+?)=(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (key) {
          values[key] = value || '';
        }
      }
    }

    return values;
  }

  /**
   * Validate add partition configuration
   */
  private validateAddPartitionConfig(
    config: AddPartitionConfig,
    metadata: NamespaceMetadata
  ): void {
    // Check if partition key already exists
    if (metadata.partitionSchema.order.includes(config.key)) {
      throw new Error(`Partition '${config.key}' already exists in namespace`);
    }

    // Validate position
    if (config.position < 0 || config.position > metadata.partitionSchema.order.length) {
      throw new Error(
        `Invalid position ${config.position}. Must be between 0 and ${metadata.partitionSchema.order.length}`
      );
    }

    // Validate regex if provided
    if (config.regex) {
      try {
        new RegExp(config.regex);
      } catch (error) {
        throw new Error(`Invalid regex: ${error}`);
      }
    }

    // Validate deriveFromData function
    if (!config.deriveFromData) {
      throw new Error('deriveFromData function is required for adding partition');
    }

    try {
      new Function('item', `return ${config.deriveFromData}`);
    } catch (error) {
      throw new Error(`Invalid deriveFromData function: ${error}`);
    }
  }
}
