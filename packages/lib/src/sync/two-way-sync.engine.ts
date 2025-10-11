/**
 * Two-Way Sync Engine
 *
 * Implements bidirectional synchronization between two backends.
 * Changes flow in both directions with conflict resolution.
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
  SyncConflict,
} from './sync.types';
import { SyncStateManager } from './sync-state.manager';
import { ChangeDetector } from './change-detector';
import { ConflictResolver } from './conflict-resolver';

/**
 * Two-way sync engine implementation.
 */
export class TwoWaySyncEngine {
  private changeDetector: ChangeDetector;
  private conflictResolver: ConflictResolver;

  constructor(
    private backend1: SyncBackend,
    private backend2: SyncBackend,
    private stateManager: SyncStateManager,
    private config: SyncConfig
  ) {
    this.changeDetector = new ChangeDetector(stateManager);
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Executes the two-way sync operation.
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
    const conflicts: SyncConflict[] = [];

    try {
      // Phase 1: Detect changes in both backends
      this.reportProgress('detecting-changes', 0, 0, 0, stats);

      const { changes1, changes2 } = await this.detectBidirectionalChanges();
      stats.itemsChecked = changes1.length + changes2.length;

      // Phase 2: Resolve conflicts
      this.reportProgress('resolving-conflicts', 25, stats.itemsChecked, 0, stats);

      const resolved = await this.resolveAndSync(
        changes1,
        changes2,
        stats,
        errors,
        conflicts
      );

      // Phase 3: Apply changes
      this.reportProgress('syncing', 50, stats.itemsChecked, resolved, stats);

      // Sync related data if configured
      if (this.shouldSyncRelatedData()) {
        await this.syncRelatedData(stats, errors);
      }

      // Finalize
      this.reportProgress('finalizing', 100, stats.itemsChecked, stats.itemsChecked, stats);

      const endTime = new Date();
      return {
        success: errors.length === 0,
        direction: SyncDirection.TWO_WAY,
        backends: [this.backend1.id, this.backend2.id],
        stats,
        conflicts,
        errors,
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    } catch (error: any) {
      const endTime = new Date();
      errors.push({
        type: 'unknown',
        message: error.message,
        stack: error.stack,
        occurredAt: new Date().toISOString(),
      });

      return {
        success: false,
        direction: SyncDirection.TWO_WAY,
        backends: [this.backend1.id, this.backend2.id],
        stats,
        conflicts,
        errors,
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    }
  }

  /**
   * Detects changes in both backends.
   */
  async detectBidirectionalChanges(): Promise<{
    changes1: ItemChange[];
    changes2: ItemChange[];
  }> {
    const [changes1, changes2] = await Promise.all([
      this.changeDetector.detectChanges(this.backend1),
      this.changeDetector.detectChanges(this.backend2),
    ]);

    return { changes1, changes2 };
  }

  /**
   * Resolves conflicts and syncs changes bidirectionally.
   */
  async resolveAndSync(
    changes1: ItemChange[],
    changes2: ItemChange[],
    stats: SyncStats,
    errors: SyncError[],
    conflicts: SyncConflict[]
  ): Promise<number> {
    let processedCount = 0;

    // Build a map of items by sync ID to detect conflicts
    const itemMap = new Map<string, { change1?: ItemChange; change2?: ItemChange }>();

    // Process changes from backend1
    for (const change of changes1) {
      const syncItem = await this.stateManager.findSyncItemByBackendId(
        this.backend1.id,
        change.itemId
      );

      if (syncItem) {
        const existing = itemMap.get(syncItem.syncId) || {};
        existing.change1 = change;
        itemMap.set(syncItem.syncId, existing);
      } else {
        // New item, no conflict possible
        itemMap.set(change.itemId, { change1: change });
      }
    }

    // Process changes from backend2
    for (const change of changes2) {
      const syncItem = await this.stateManager.findSyncItemByBackendId(
        this.backend2.id,
        change.itemId
      );

      if (syncItem) {
        const existing = itemMap.get(syncItem.syncId) || {};
        existing.change2 = change;
        itemMap.set(syncItem.syncId, existing);
      } else {
        // New item, no conflict possible
        itemMap.set(change.itemId, { change2: change });
      }
    }

    // Process each item
    for (const [itemKey, { change1, change2 }] of itemMap.entries()) {
      try {
        if (change1 && change2) {
          // Both changed - potential conflict
          await this.handleBidirectionalChange(
            change1,
            change2,
            stats,
            conflicts
          );
        } else if (change1) {
          // Only backend1 changed - sync to backend2
          await this.syncChange(
            change1,
            this.backend1,
            this.backend2,
            stats
          );
        } else if (change2) {
          // Only backend2 changed - sync to backend1
          await this.syncChange(
            change2,
            this.backend2,
            this.backend1,
            stats
          );
        }

        processedCount++;
      } catch (error: any) {
        errors.push({
          type: this.categorizeError(error),
          message: error.message,
          itemId: change1?.itemId || change2?.itemId,
          stack: error.stack,
          occurredAt: new Date().toISOString(),
        });

        if (this.config.callbacks?.onError) {
          this.config.callbacks.onError(errors[errors.length - 1]!);
        }

        stats.itemsSkipped++;
      }
    }

    return processedCount;
  }

  /**
   * Handles a change in both backends (conflict resolution).
   * @private
   */
  private async handleBidirectionalChange(
    change1: ItemChange,
    change2: ItemChange,
    stats: SyncStats,
    conflicts: SyncConflict[]
  ): Promise<void> {
    // If both are deletes, no conflict
    if (change1.changeType === 'deleted' && change2.changeType === 'deleted') {
      await this.handleDelete(change1, this.backend1, stats);
      return;
    }

    // If one is delete and other is update, conflict
    if (
      (change1.changeType === 'deleted' && change2.changeType === 'updated') ||
      (change1.changeType === 'updated' && change2.changeType === 'deleted')
    ) {
      // Resolve based on strategy
      if (this.config.conflictStrategy === 'source-wins') {
        await this.syncChange(change1, this.backend1, this.backend2, stats);
      } else {
        await this.syncChange(change2, this.backend2, this.backend1, stats);
      }
      return;
    }

    // Both updated - detect field conflicts
    const task1 = change1.newValues as Task;
    const task2 = change2.newValues as Task;

    if (!task1 || !task2) return;

    // Detect conflicts
    const changedFields = [
      ...(change1.changedFields || []),
      ...(change2.changedFields || []),
    ];
    const uniqueFields = Array.from(new Set(changedFields));

    const fieldConflicts = this.conflictResolver.detectConflicts(
      task1,
      task2,
      uniqueFields,
      this.backend1.id,
      this.backend2.id
    );

    if (fieldConflicts.length > 0) {
      stats.conflictsDetected += fieldConflicts.length;
      conflicts.push(...fieldConflicts);

      // Resolve conflicts
      for (const conflict of fieldConflicts) {
        try {
          const resolvedValue = await this.conflictResolver.resolveConflict(
            conflict,
            this.config.conflictStrategy,
            this.config.callbacks?.onConflict
          );

          // Mark as resolved
          const resolved = this.conflictResolver.markResolved(
            conflict,
            resolvedValue,
            this.backend1.id
          );
          Object.assign(conflict, resolved);

          stats.conflictsResolved++;
        } catch (error: any) {
          // Manual resolution required or resolution failed
          if (this.config.callbacks?.onError) {
            this.config.callbacks.onError({
              type: 'conflict',
              message: `Failed to resolve conflict: ${error.message}`,
              occurredAt: new Date().toISOString(),
            });
          }
        }
      }

      // Merge items with resolved conflicts
      const merged = this.conflictResolver.mergeItems(
        task1,
        task2,
        this.backend1.id,
        this.backend2.id
      );

      // Apply merged result to both backends
      if (!this.config.dryRun) {
        await this.backend1.backends.task.updateTask(task1.gid, merged);
        await this.backend2.backends.task.updateTask(task2.gid, merged);
      }

      stats.itemsUpdated += 2;

      // Update sync state
      const syncItem = await this.stateManager.findSyncItemByBackendId(
        this.backend1.id,
        task1.gid
      );

      if (syncItem) {
        await this.stateManager.updateSyncItem(syncItem.syncId, {
          versions: {
            [this.backend1.id]: this.changeDetector.computeItemHash(merged),
            [this.backend2.id]: this.changeDetector.computeItemHash(merged),
          },
          lastSyncTimes: {
            [this.backend1.id]: new Date().toISOString(),
            [this.backend2.id]: new Date().toISOString(),
          },
          hasConflicts: false,
        });
      }
    } else {
      // No conflicts, just sync changes
      await this.syncChange(change1, this.backend1, this.backend2, stats);
    }
  }

  /**
   * Syncs a single change from source to target.
   * @private
   */
  private async syncChange(
    change: ItemChange,
    source: SyncBackend,
    target: SyncBackend,
    stats: SyncStats
  ): Promise<void> {
    switch (change.changeType) {
      case 'created':
        await this.handleCreate(change, source, target, stats);
        break;
      case 'updated':
        await this.handleUpdate(change, source, target, stats);
        break;
      case 'deleted':
        await this.handleDelete(change, source, stats);
        break;
    }
  }

  /**
   * Handles creating a new item.
   * @private
   */
  private async handleCreate(
    change: ItemChange,
    source: SyncBackend,
    target: SyncBackend,
    stats: SyncStats
  ): Promise<void> {
    const sourceTask = change.newValues as Task;
    if (!sourceTask) return;

    if (this.config.dryRun) {
      stats.itemsCreated++;
      return;
    }

    // Create in target
    const targetTask = await target.backends.task.createTask(
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

    if (Object.keys(updates).length > 0) {
      await target.backends.task.updateTask(targetTask.gid, updates);
    }

    // Create sync state
    await this.stateManager.createSyncItem(
      {
        [source.id]: sourceTask.gid,
        [target.id]: targetTask.gid,
      },
      {
        [source.id]: this.changeDetector.computeItemHash(sourceTask),
        [target.id]: this.changeDetector.computeItemHash(targetTask),
      }
    );

    stats.itemsCreated++;
  }

  /**
   * Handles updating an existing item.
   * @private
   */
  private async handleUpdate(
    change: ItemChange,
    source: SyncBackend,
    target: SyncBackend,
    stats: SyncStats
  ): Promise<void> {
    const sourceTask = change.newValues as Task;
    if (!sourceTask) return;

    const syncItem = await this.stateManager.findSyncItemByBackendId(
      source.id,
      sourceTask.gid
    );

    if (!syncItem) {
      // Not synced yet, create
      await this.handleCreate(change, source, target, stats);
      return;
    }

    const targetId = syncItem.backendIds[target.id];
    if (!targetId) return;

    if (this.config.dryRun) {
      stats.itemsUpdated++;
      return;
    }

    // Build updates
    const updates: Partial<Task> = {};
    if (change.changedFields) {
      for (const field of change.changedFields) {
        updates[field as keyof Task] = (sourceTask as any)[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await target.backends.task.updateTask(targetId, updates);
    }

    // Update sync state
    await this.stateManager.updateSyncItem(syncItem.syncId, {
      versions: {
        ...syncItem.versions,
        [source.id]: this.changeDetector.computeItemHash(sourceTask),
      },
      lastSyncTimes: {
        ...syncItem.lastSyncTimes,
        [source.id]: new Date().toISOString(),
        [target.id]: new Date().toISOString(),
      },
    });

    stats.itemsUpdated++;
  }

  /**
   * Handles deleting an item.
   * @private
   */
  private async handleDelete(
    change: ItemChange,
    source: SyncBackend,
    stats: SyncStats
  ): Promise<void> {
    const syncItem = await this.stateManager.findSyncItemByBackendId(
      source.id,
      change.itemId
    );

    if (!syncItem) {
      stats.itemsSkipped++;
      return;
    }

    if (this.config.dryRun) {
      stats.itemsDeleted++;
      return;
    }

    // Delete from both backends
    for (const [backendId, itemId] of Object.entries(syncItem.backendIds)) {
      try {
        const backend =
          backendId === this.backend1.id ? this.backend1 : this.backend2;
        await backend.backends.task.deleteTask(itemId);
      } catch (error) {
        // Item may already be deleted
      }
    }

    // Delete sync state
    await this.stateManager.deleteSyncItem(syncItem.syncId);
    stats.itemsDeleted++;
  }

  /**
   * Syncs related data between backends.
   * @private
   */
  private async syncRelatedData(stats: SyncStats, errors: SyncError[]): Promise<void> {
    try {
      if (this.config.syncTags) {
        await this.syncTags();
      }

      if (this.config.syncSections) {
        await this.syncSections();
      }
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
   * Syncs tags between backends.
   * @private
   */
  private async syncTags(): Promise<void> {
    const [tags1, tags2] = await Promise.all([
      this.backend1.backends.tag.listTags(),
      this.backend2.backends.tag.listTags(),
    ]);

    const tags1Names = new Set(tags1.map((t) => t.name));
    const tags2Names = new Set(tags2.map((t) => t.name));

    // Sync to backend2
    for (const tag of tags1) {
      if (!tags2Names.has(tag.name) && !this.config.dryRun) {
        await this.backend2.backends.tag.createTag(tag.name);
      }
    }

    // Sync to backend1
    for (const tag of tags2) {
      if (!tags1Names.has(tag.name) && !this.config.dryRun) {
        await this.backend1.backends.tag.createTag(tag.name);
      }
    }
  }

  /**
   * Syncs sections between backends.
   * @private
   */
  private async syncSections(): Promise<void> {
    const [sections1, sections2] = await Promise.all([
      this.backend1.backends.section.listSections(),
      this.backend2.backends.section.listSections(),
    ]);

    const sections1Names = new Set(sections1.map((s) => s.name));
    const sections2Names = new Set(sections2.map((s) => s.name));

    // Sync to backend2
    for (const section of sections1) {
      if (!sections2Names.has(section.name) && !this.config.dryRun) {
        await this.backend2.backends.section.createSection(section.name);
      }
    }

    // Sync to backend1
    for (const section of sections2) {
      if (!sections1Names.has(section.name) && !this.config.dryRun) {
        await this.backend1.backends.section.createSection(section.name);
      }
    }
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
      this.config.syncAttachments
    );
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
