/**
 * One-Way Sync Engine
 *
 * Implements one-way synchronization from source to target backend.
 * Changes flow only in one direction: source → target.
 */

import { Task } from '../backends/core/types';
import {
  SyncBackend,
  SyncConfig,
  SyncResult,
  SyncStats,
  SyncError,
  SyncDirection,
  ItemChange,
} from './sync.types';
import { SyncStateManager } from './sync-state.manager';
import { ChangeDetector } from './change-detector';

/**
 * One-way sync engine implementation.
 */
export class OneWaySyncEngine {
  private changeDetector: ChangeDetector;

  constructor(
    private source: SyncBackend,
    private target: SyncBackend,
    private stateManager: SyncStateManager,
    private config: SyncConfig
  ) {
    this.changeDetector = new ChangeDetector(stateManager);
  }

  /**
   * Executes the one-way sync operation.
   *
   * @returns Sync result with statistics and any errors
   */
  async sync(): Promise<SyncResult> {
    const startTime = new Date();
    const stats: SyncStats = {
      itemsChecked: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      itemsSkipped: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
    };
    const errors: SyncError[] = [];

    try {
      // Report progress
      this.reportProgress('detecting-changes', 0, 0, 0, stats);

      // Detect changes in source
      const changes = await this.changeDetector.detectChanges(this.source);
      stats.itemsChecked = changes.length;

      // Filter changes if needed
      const filteredChanges = await this.filterChanges(changes);

      // Report progress
      this.reportProgress('syncing', 0, filteredChanges.length, 0, stats);

      // Process each change
      for (let i = 0; i < filteredChanges.length; i++) {
        const change = filteredChanges[i]!;

        try {
          await this.processChange(change, stats);

          // Report progress
          const percentage = ((i + 1) / filteredChanges.length) * 100;
          this.reportProgress(
            'syncing',
            percentage,
            filteredChanges.length,
            i + 1,
            stats
          );
        } catch (error: any) {
          const syncError: SyncError = {
            type: this.categorizeError(error),
            message: error.message,
            backend: this.target.id,
            itemId: change.itemId,
            stack: error.stack,
            occurredAt: new Date().toISOString(),
          };
          errors.push(syncError);

          if (this.config.callbacks?.onError) {
            this.config.callbacks.onError(syncError);
          }

          stats.itemsSkipped++;
        }
      }

      // Sync related data if configured
      if (this.shouldSyncRelatedData()) {
        await this.syncRelatedData(stats, errors);
      }

      // Finalize
      this.reportProgress('finalizing', 100, filteredChanges.length, filteredChanges.length, stats);

      const endTime = new Date();
      return {
        success: errors.length === 0,
        direction: SyncDirection.ONE_WAY,
        backends: [this.source.id, this.target.id],
        stats,
        conflicts: [],
        errors,
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    } catch (error: any) {
      const endTime = new Date();
      const syncError: SyncError = {
        type: 'unknown',
        message: error.message,
        stack: error.stack,
        occurredAt: new Date().toISOString(),
      };
      errors.push(syncError);

      return {
        success: false,
        direction: SyncDirection.ONE_WAY,
        backends: [this.source.id, this.target.id],
        stats,
        conflicts: [],
        errors,
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    }
  }

  /**
   * Syncs tasks from source to target.
   */
  async syncTasks(): Promise<void> {
    const changes = await this.changeDetector.detectChanges(this.source);
    const stats: SyncStats = {
      itemsChecked: changes.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      itemsSkipped: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
    };

    for (const change of changes) {
      await this.processChange(change, stats);
    }
  }

  /**
   * Syncs related data (tags, sections, comments, etc.) based on config.
   */
  async syncRelatedData(stats: SyncStats, errors: SyncError[]): Promise<void> {
    try {
      // Sync tags
      if (this.config.syncTags) {
        await this.syncTags();
      }

      // Sync sections
      if (this.config.syncSections) {
        await this.syncSections();
      }

      // Note: Comments, attachments, time entries, etc. would be synced
      // as part of the task sync or in separate passes
    } catch (error: any) {
      errors.push({
        type: 'backend',
        message: `Failed to sync related data: ${error.message}`,
        stack: error.stack,
        occurredAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Processes a single change (create, update, or delete).
   * @private
   */
  private async processChange(change: ItemChange, stats: SyncStats): Promise<void> {
    switch (change.changeType) {
      case 'created':
        await this.handleCreate(change, stats);
        break;
      case 'updated':
        await this.handleUpdate(change, stats);
        break;
      case 'deleted':
        await this.handleDelete(change, stats);
        break;
    }
  }

  /**
   * Handles creating a new item in target.
   * @private
   */
  private async handleCreate(change: ItemChange, stats: SyncStats): Promise<void> {
    if (!change.newValues) {
      throw new Error('No new values for created item');
    }

    const sourceTask = change.newValues as Task;

    // Check if already synced
    const existingSyncItem = await this.stateManager.findSyncItemByBackendId(
      this.source.id,
      sourceTask.gid
    );

    if (existingSyncItem) {
      // Already synced, skip
      stats.itemsSkipped++;
      return;
    }

    if (this.config.dryRun) {
      stats.itemsCreated++;
      return;
    }

    try {
      // Create in target
      const targetTask = await this.target.backends.task.createTask(
        sourceTask.name,
        sourceTask.notes,
        sourceTask.dueOn,
        sourceTask.priority,
        sourceTask.isMilestone
      );

      // Update additional fields
      const updates: Partial<Task> = {};
      if (sourceTask.completed) updates.completed = true;
      if (sourceTask.startOn) updates.startOn = sourceTask.startOn;
      if (sourceTask.assignee) updates.assignee = sourceTask.assignee;
      if (sourceTask.memberships) updates.memberships = sourceTask.memberships;

      if (Object.keys(updates).length > 0) {
        await this.target.backends.task.updateTask(targetTask.gid, updates);
      }

      // Create sync state
      const version = this.changeDetector.computeItemHash(sourceTask);
      await this.stateManager.createSyncItem(
        {
          [this.source.id]: sourceTask.gid,
          [this.target.id]: targetTask.gid,
        },
        {
          [this.source.id]: version,
          [this.target.id]: this.changeDetector.computeItemHash(targetTask),
        }
      );

      stats.itemsCreated++;
    } catch (error: any) {
      throw new Error(`Failed to create task in target: ${error.message}`);
    }
  }

  /**
   * Handles updating an existing item in target.
   * @private
   */
  private async handleUpdate(change: ItemChange, stats: SyncStats): Promise<void> {
    if (!change.newValues) {
      throw new Error('No new values for updated item');
    }

    const sourceTask = change.newValues as Task;

    // Find sync item
    const syncItem = await this.stateManager.findSyncItemByBackendId(
      this.source.id,
      sourceTask.gid
    );

    if (!syncItem) {
      // Not synced yet, treat as create
      await this.handleCreate(change, stats);
      return;
    }

    const targetId = syncItem.backendIds[this.target.id];
    if (!targetId) {
      throw new Error('No target ID in sync item');
    }

    if (this.config.dryRun) {
      stats.itemsUpdated++;
      return;
    }

    try {
      // Get current target task
      const targetTask = await this.target.backends.task.getTask(targetId);

      // Build updates (only changed fields)
      const updates: Partial<Task> = {};

      if (change.changedFields) {
        for (const field of change.changedFields) {
          const newValue = (sourceTask as any)[field];
          const currentValue = (targetTask as any)[field];

          // Only update if different
          if (newValue !== currentValue) {
            updates[field as keyof Task] = newValue;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await this.target.backends.task.updateTask(targetId, updates);
      }

      // Update sync state
      const newVersion = this.changeDetector.computeItemHash(sourceTask);
      await this.stateManager.updateSyncItem(syncItem.syncId, {
        versions: {
          ...syncItem.versions,
          [this.source.id]: newVersion,
        },
        lastSyncTimes: {
          ...syncItem.lastSyncTimes,
          [this.source.id]: new Date().toISOString(),
          [this.target.id]: new Date().toISOString(),
        },
      });

      stats.itemsUpdated++;
    } catch (error: any) {
      throw new Error(`Failed to update task in target: ${error.message}`);
    }
  }

  /**
   * Handles deleting an item from target.
   * @private
   */
  private async handleDelete(change: ItemChange, stats: SyncStats): Promise<void> {
    // Find sync item
    const syncItem = await this.stateManager.findSyncItemByBackendId(
      this.source.id,
      change.itemId
    );

    if (!syncItem) {
      // Not synced, nothing to delete
      stats.itemsSkipped++;
      return;
    }

    const targetId = syncItem.backendIds[this.target.id];
    if (!targetId) {
      stats.itemsSkipped++;
      return;
    }

    if (this.config.dryRun) {
      stats.itemsDeleted++;
      return;
    }

    try {
      // Delete from target
      await this.target.backends.task.deleteTask(targetId);

      // Delete sync state
      await this.stateManager.deleteSyncItem(syncItem.syncId);

      stats.itemsDeleted++;
    } catch (error: any) {
      throw new Error(`Failed to delete task from target: ${error.message}`);
    }
  }

  /**
   * Filters changes based on config filter.
   * @private
   */
  private async filterChanges(changes: ItemChange[]): Promise<ItemChange[]> {
    if (!this.config.filter) {
      return changes;
    }

    const filtered: ItemChange[] = [];

    for (const change of changes) {
      if (await this.shouldSyncChange(change)) {
        filtered.push(change);
      }
    }

    return filtered;
  }

  /**
   * Checks if a change should be synced based on filter config.
   * @private
   */
  private async shouldSyncChange(change: ItemChange): Promise<boolean> {
    if (!this.config.filter) return true;

    const filter = this.config.filter;
    const task = change.newValues as Task;

    if (!task) return false;

    // Filter by completed status
    if (filter.completed !== undefined && task.completed !== filter.completed) {
      return false;
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      if (!task.tags || !task.tags.some((tag) => filter.tags!.includes(tag))) {
        return false;
      }
    }

    // Filter by custom function
    if (filter.customFilter) {
      return filter.customFilter(task);
    }

    return true;
  }

  /**
   * Checks if related data should be synced.
   * @private
   */
  private shouldSyncRelatedData(): boolean {
    return !!(
      this.config.syncTags ||
      this.config.syncSections ||
      this.config.syncSubtasks ||
      this.config.syncComments ||
      this.config.syncAttachments ||
      this.config.syncDependencies ||
      this.config.syncTimeEntries
    );
  }

  /**
   * Syncs tags between backends.
   * @private
   */
  private async syncTags(): Promise<void> {
    const sourceTags = await this.source.backends.tag.listTags();
    const targetTags = await this.target.backends.tag.listTags();

    const targetTagNames = new Set(targetTags.map((t) => t.name));

    for (const sourceTag of sourceTags) {
      if (!targetTagNames.has(sourceTag.name)) {
        if (!this.config.dryRun) {
          await this.target.backends.tag.createTag(sourceTag.name);
        }
      }
    }
  }

  /**
   * Syncs sections between backends.
   * @private
   */
  private async syncSections(): Promise<void> {
    const sourceSections = await this.source.backends.section.listSections();
    const targetSections = await this.target.backends.section.listSections();

    const targetSectionNames = new Set(targetSections.map((s) => s.name));

    for (const sourceSection of sourceSections) {
      if (!targetSectionNames.has(sourceSection.name)) {
        if (!this.config.dryRun) {
          await this.target.backends.section.createSection(sourceSection.name);
        }
      }
    }
  }

  /**
   * Reports sync progress via callback.
   * @private
   */
  private reportProgress(
    phase: 'detecting-changes' | 'resolving-conflicts' | 'syncing' | 'finalizing',
    percentage: number,
    totalItems: number,
    itemsProcessed: number,
    stats: SyncStats
  ): void {
    if (this.config.callbacks?.onProgress) {
      this.config.callbacks.onProgress({
        phase,
        percentage,
        currentItem: undefined,
        itemsProcessed,
        totalItems,
        stats,
      });
    }
  }

  /**
   * Categorizes an error by type.
   * @private
   */
  private categorizeError(error: any): SyncError['type'] {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('conflict')) {
      return 'conflict';
    }
    if (message.includes('backend') || message.includes('api')) {
      return 'backend';
    }

    return 'unknown';
  }
}
