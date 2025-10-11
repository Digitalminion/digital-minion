/**
 * Write Service
 *
 * Handles all write operations (insert, update, delete) with retry logic.
 */

import { DataSourceAdapter, FilterCriteria, Partition } from '../data.types';
import { FilterComposer } from '../../operations/filter/filter.composer';
import { RetryManager } from '../../operations/retry/retry.manager';

export class WriteService<T = any> {
  private adapter: DataSourceAdapter<T>;
  private filterComposer: FilterComposer<T>;
  private retryManager: RetryManager;
  private basePath: string;

  constructor(
    adapter: DataSourceAdapter<T>,
    filterComposer: FilterComposer<T>,
    retryManager: RetryManager,
    basePath: string
  ) {
    this.adapter = adapter;
    this.filterComposer = filterComposer;
    this.retryManager = retryManager;
    this.basePath = basePath;
  }

  /**
   * Convert partition ID to Partition object
   */
  private toPartition(partitionId: string): Partition<T> {
    return {
      id: partitionId,
      name: partitionId,
      type: 'file',
      location: `${this.basePath}/${partitionId}`
    };
  }

  /**
   * Insert data into partition (using partition object)
   */
  async insertToPartition(data: T[], partition: Partition<T>): Promise<void> {
    await this.retryManager.execute(async () => {
      // Use append to add data without overwriting existing records
      await this.adapter.append(partition, data);
    }, `insert-${partition.id}`);
  }

  /**
   * Insert data into partition (deprecated - use insertToPartition)
   */
  async insert(data: T[], partitionId: string): Promise<void> {
    const partition = this.toPartition(partitionId);
    await this.retryManager.execute(async () => {
      // Use append to add data without overwriting existing records
      await this.adapter.append(partition, data);
    }, `insert-${partitionId}`);
  }

  /**
   * Update items matching filter (using partition object)
   */
  async updateInPartition(
    partition: Partition<T>,
    filter: FilterCriteria<T>,
    updates: Partial<T>
  ): Promise<number> {
    const result = await this.retryManager.execute(async () => {
      // Read current data
      const currentData = await this.adapter.read(partition);

      // Find and update matching items
      let updateCount = 0;
      const updatedData = currentData.map(item => {
        if (this.filterComposer.matches(item, filter)) {
          updateCount++;
          return { ...item, ...updates };
        }
        return item;
      });

      // Write back if changes made
      if (updateCount > 0) {
        await this.adapter.write(partition, updatedData);
      }

      return updateCount;
    }, `update-${partition.id}`);

    if (!result.success) {
      throw result.error || new Error('Update failed');
    }

    return result.value || 0;
  }

  /**
   * Update items matching filter (deprecated - use updateInPartition)
   */
  async update(
    partitionId: string,
    filter: FilterCriteria<T>,
    updates: Partial<T>
  ): Promise<number> {
    const partition = this.toPartition(partitionId);
    return this.updateInPartition(partition, filter, updates);
  }

  /**
   * Delete items matching filter (using partition object)
   */
  async deleteFromPartition(partition: Partition<T>, filter: FilterCriteria<T>): Promise<number> {
    const result = await this.retryManager.execute(async () => {
      // Read current data
      const currentData = await this.adapter.read(partition);

      // Filter out matching items
      const initialCount = currentData.length;
      const filteredData = currentData.filter(
        item => !this.filterComposer.matches(item, filter)
      );

      const deleteCount = initialCount - filteredData.length;

      // Write back if changes made
      if (deleteCount > 0) {
        await this.adapter.write(partition, filteredData);
      }

      return deleteCount;
    }, `delete-${partition.id}`);

    if (!result.success) {
      throw result.error || new Error('Delete failed');
    }

    return result.value || 0;
  }

  /**
   * Delete items matching filter (deprecated - use deleteFromPartition)
   */
  async delete(partitionId: string, filter: FilterCriteria<T>): Promise<number> {
    const partition = this.toPartition(partitionId);
    return this.deleteFromPartition(partition, filter);
  }

  /**
   * Append data to partition (optimized for append-only operations)
   */
  async append(data: T[], partitionId: string): Promise<void> {
    const partition = this.toPartition(partitionId);
    await this.retryManager.execute(async () => {
      const currentData = await this.adapter.read(partition);
      const combined = [...currentData, ...data];
      await this.adapter.write(partition, combined);
    }, `append-${partitionId}`);
  }
}
