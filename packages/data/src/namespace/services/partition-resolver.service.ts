/**
 * Partition Resolver Service
 *
 * Resolves partition paths for items and queries.
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import {
  NamespaceMetadata,
  NamespaceQueryOptions,
  PartitionInfo
} from '../namespace.types';

export class PartitionResolverService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get partition path for item
   */
  async getPartitionPath(metadata: NamespaceMetadata, item: any): Promise<string> {
    const partitionValues: Record<string, string> = {};

    for (const key of metadata.partitionSchema.order) {
      partitionValues[key] = String(item[key]);
    }

    return this.buildPartitionPath(metadata.partitionSchema.order, partitionValues);
  }

  /**
   * Resolve query partitions
   */
  async resolveQueryPartitions(
    namespace: string,
    metadata: NamespaceMetadata,
    options?: NamespaceQueryOptions
  ): Promise<PartitionInfo[]> {
    const namespacePath = join(this.basePath, namespace, 'data');

    // If no filters, return all partitions
    if (!options?.partitionFilter) {
      return this.getAllPartitions(namespacePath, metadata.partitionSchema.order);
    }

    // Filter partitions by criteria
    const allPartitions = await this.getAllPartitions(namespacePath, metadata.partitionSchema.order);

    return allPartitions.filter(partition =>
      this.partitionMatchesFilter(partition.values, options.partitionFilter!)
    );
  }

  /**
   * Ensure partition exists
   */
  async ensurePartitionExists(
    namespace: string,
    metadata: NamespaceMetadata,
    item: any
  ): Promise<string> {
    const partitionPath = await this.getPartitionPath(metadata, item);
    const fullPath = join(this.basePath, namespace, 'data', partitionPath);

    await fs.mkdir(fullPath, { recursive: true });

    return partitionPath;
  }

  /**
   * Build partition path from values
   */
  private buildPartitionPath(
    partitionKeys: string[],
    values: Record<string, string>
  ): string {
    const parts: string[] = [];

    for (const key of partitionKeys) {
      const value = values[key];
      if (!value) {
        throw new Error(`Missing partition key: ${key}`);
      }
      parts.push(`${key}=${value}`);
    }

    return parts.join('/');
  }

  /**
   * Get all partitions
   */
  private async getAllPartitions(
    basePath: string,
    partitionKeys: string[]
  ): Promise<PartitionInfo[]> {
    const partitions: PartitionInfo[] = [];

    try {
      const entries = await this.scanDirectory(basePath, partitionKeys);
      for (const entry of entries) {
        const fullPath = join(basePath, entry.path);
        let stats;
        try {
          stats = await fs.stat(fullPath);
        } catch {
          stats = null;
        }

        partitions.push({
          path: entry.path,
          values: this.parsePartitionPath(entry.path),
          created: stats?.birthtime.toISOString() ?? new Date().toISOString(),
          itemCount: 0, // Would need to count items in data file
          lastUpdated: stats?.mtime.toISOString() ?? new Date().toISOString(),
          sizeBytes: stats?.size ?? 0
        });
      }
    } catch (error) {
      // Directory doesn't exist, return empty
    }

    return partitions;
  }

  /**
   * Scan directory recursively
   */
  private async scanDirectory(
    dir: string,
    partitionKeys: string[],
    depth: number = 0
  ): Promise<{ path: string }[]> {
    if (depth >= partitionKeys.length) {
      return [{ path: '' }];
    }

    const results: { path: string }[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = join(dir, entry.name);
          const subResults = await this.scanDirectory(subPath, partitionKeys, depth + 1);

          for (const sub of subResults) {
            const fullPath = sub.path ? `${entry.name}/${sub.path}` : entry.name;
            results.push({ path: fullPath });
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return results;
  }

  /**
   * Parse partition path
   */
  private parsePartitionPath(partitionPath: string): Record<string, string> {
    const values: Record<string, string> = {};
    const parts = partitionPath.split('/');

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        values[key] = value;
      }
    }

    return values;
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
}
