/**
 * JSON Data Source Adapter
 *
 * Adapter for reading/writing JSON files as data partitions
 */

import { DataSourceAdapter, Partition, FilterCriteria } from '../data.types';
import { JsonObjectStorage } from '../../storage/json.storage';
import { FilterComposer } from '../../operations/filter/filter.composer';

/**
 * JSON Adapter for file-based partitions
 */
export class JSONAdapter<T = any> implements DataSourceAdapter<T> {
  type = 'json';
  private storage: JsonObjectStorage;
  private filterComposer: FilterComposer<T>;
  private connected: boolean = false;

  constructor() {
    this.storage = new JsonObjectStorage();
    this.filterComposer = new FilterComposer<T>();
  }

  /**
   * Connect to data source
   */
  async connect(config?: any): Promise<void> {
    this.connected = true;
  }

  /**
   * Disconnect from data source
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * Read all data from partition
   */
  async read(partition: Partition<T>): Promise<T[]> {
    this.ensureConnected();

    try {
      const data = await this.storage.read(partition.location) as { items?: T[]; data?: T[] };

      // Support both array and object with items/data property
      if (Array.isArray(data)) {
        return data as unknown as T[];
      } else if (data && Array.isArray(data.items)) {
        return data.items;
      } else if (data && Array.isArray(data.data)) {
        return data.data;
      }

      throw new Error('JSON file does not contain an array or items/data array');
    } catch (error) {
      throw new Error(`Failed to read partition ${partition.id}: ${error}`);
    }
  }

  /**
   * Write data to partition (overwrite)
   */
  async write(partition: Partition<T>, data: T[]): Promise<void> {
    this.ensureConnected();

    try {
      // Only backup if file exists
      const fileExists = await this.storage.exists(partition.location);

      await this.storage.write(partition.location, { items: data }, {
        pretty: true,
        backup: fileExists
      });
    } catch (error) {
      throw new Error(`Failed to write to partition ${partition.id}: ${error}`);
    }
  }

  /**
   * Append data to partition
   */
  async append(partition: Partition<T>, data: T[]): Promise<void> {
    this.ensureConnected();

    try {
      const existing = await this.read(partition);
      await this.write(partition, [...existing, ...data]);
    } catch (error) {
      throw new Error(`Failed to append to partition ${partition.id}: ${error}`);
    }
  }

  /**
   * Delete items matching filter
   */
  async delete(partition: Partition<T>, filter: FilterCriteria<T>): Promise<number> {
    this.ensureConnected();

    try {
      const data = await this.read(partition);
      const remaining = this.filterComposer.filter(data, { $not: filter } as any);
      const deletedCount = data.length - remaining.length;

      if (deletedCount > 0) {
        await this.write(partition, remaining);
      }

      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to delete from partition ${partition.id}: ${error}`);
    }
  }

  /**
   * Count items in partition
   */
  async count(partition: Partition<T>): Promise<number> {
    this.ensureConnected();

    try {
      const data = await this.read(partition);
      return data.length;
    } catch (error) {
      throw new Error(`Failed to count partition ${partition.id}: ${error}`);
    }
  }

  /**
   * Check if partition exists
   */
  async exists(partition: Partition<T>): Promise<boolean> {
    try {
      const fs = require('fs').promises;
      await fs.access(partition.location);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure adapter is connected
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Adapter not connected. Call connect() first.');
    }
  }
}
