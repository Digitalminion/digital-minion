/**
 * JSONL Data Source Adapter
 *
 * Adapter for reading/writing JSONL files as data partitions
 */

import { DataSourceAdapter, Partition, FilterCriteria } from '../data.types';
import { JsonlRowStorage } from '../../storage/jsonl.storage';
import { FilterComposer } from '../../operations/filter/filter.composer';

/**
 * JSONL Adapter for file-based partitions
 */
export class JSONLAdapter<T = any> implements DataSourceAdapter<T> {
  type = 'jsonl';
  private storage: JsonlRowStorage<T>;
  private filterComposer: FilterComposer<T>;
  private connected: boolean = false;

  constructor() {
    this.storage = new JsonlRowStorage<T>();
    this.filterComposer = new FilterComposer<T>();
  }

  /**
   * Connect to data source
   */
  async connect(config?: any): Promise<void> {
    // JSONL doesn't require connection, just mark as connected
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
      return await this.storage.readAll(partition.location);
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
      await this.storage.writeAll(partition.location, data);
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
      await this.storage.appendRows(partition.location, data);
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
      return await this.storage.count(partition.location);
    } catch (error) {
      throw new Error(`Failed to count partition ${partition.id}: ${error}`);
    }
  }

  /**
   * Check if partition exists
   */
  async exists(partition: Partition<T>): Promise<boolean> {
    try {
      return await this.storage.exists(partition.location);
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
