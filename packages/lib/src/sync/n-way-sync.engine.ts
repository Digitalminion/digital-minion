/**
 * N-Way Sync Engine
 *
 * Implements N-way synchronization across multiple backends.
 * Maintains consistency across all backends with conflict resolution.
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
 * Represents changes detected across multiple backends for a single item.
 */
interface MultiBackendChanges {
  syncId?: string;
  changes: Map<string, ItemChange>; // backendId -> change
}

/**
 * N-way sync engine implementation.
 */
export class NWaySyncEngine {
  private changeDetector: ChangeDetector;
  private conflictResolver: ConflictResolver;

  constructor(
    private backends: SyncBackend[],
    private stateManager: SyncStateManager,
    private config: SyncConfig
  ) {
    if (backends.length < 2) {
      throw new Error('N-way sync requires at least 2 backends');
    }

    this.changeDetector = new ChangeDetector(stateManager);
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Executes the N-way sync operation.
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
      // Phase 1: Detect changes in all backends
      this.reportProgress('detecting-changes', 0, 0, 0, stats);

      const allChanges = await this.detectChangesAcrossAll();
      stats.itemsChecked = allChanges.reduce(
        (sum, changes) => sum + changes.length,
        0
      );

      // Phase 2: Build change graph and resolve conflicts
      this.reportProgress('resolving-conflicts', 25, stats.itemsChecked, 0, stats);

      const changeGraph = await this.buildChangeGraph(allChanges);

      // Phase 3: Sync across all backends
      this.reportProgress('syncing', 50, changeGraph.size, 0, stats);

      await this.syncAcrossAll(changeGraph, stats, errors, conflicts);

      // Phase 4: Sync related data
      if (this.shouldSyncRelatedData()) {
        await this.syncRelatedData(stats, errors);
      }

      // Finalize
      this.reportProgress('finalizing', 100, changeGraph.size, changeGraph.size, stats);

      const endTime = new Date();
      return {
        success: errors.length === 0,
        direction: SyncDirection.N_WAY,
        backends: this.backends.map((b) => b.id),
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
        direction: SyncDirection.N_WAY,
        backends: this.backends.map((b) => b.id),
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
   * Syncs all backends with each other to achieve consistency.
   */
  async syncAcrossAll(
    changeGraph: Map<string, MultiBackendChanges>,
    stats: SyncStats,
    errors: SyncError[],
    conflicts: SyncConflict[]
  ): Promise<void> {
    let processedCount = 0;

    for (const [itemKey, multiChange] of changeGraph.entries()) {
      try {
        await this.syncItem(multiChange, stats, conflicts);
        processedCount++;

        // Report progress
        const percentage = (processedCount / changeGraph.size) * 100;
        this.reportProgress('syncing', 50 + percentage * 0.4, changeGraph.size, processedCount, stats);
      } catch (error: any) {
        errors.push({
          type: this.categorizeError(error),
          message: error.message,
          itemId: itemKey,
          stack: error.stack,
          occurredAt: new Date().toISOString(),
        });

        if (this.config.callbacks?.onError) {
          this.config.callbacks.onError(errors[errors.length - 1]!);
        }

        stats.itemsSkipped++;
      }
    }
  }

  /**
   * Detects changes in all backends.
   * @private
   */
  private async detectChangesAcrossAll(): Promise<ItemChange[][]> {
    const allChanges = await Promise.all(
      this.backends.map((backend) => this.changeDetector.detectChanges(backend))
    );

    return allChanges;
  }

  /**
   * Builds a graph of changes grouped by item across all backends.
   * @private
   */
  private async buildChangeGraph(
    allChanges: ItemChange[][]
  ): Promise<Map<string, MultiBackendChanges>> {
    const changeGraph = new Map<string, MultiBackendChanges>();

    for (let i = 0; i < allChanges.length; i++) {
      const backendChanges = allChanges[i]!;
      const backend = this.backends[i]!;

      for (const change of backendChanges) {
        // Find sync item for this change
        const syncItem = await this.stateManager.findSyncItemByBackendId(
          backend.id,
          change.itemId
        );

        const key = syncItem?.syncId || change.itemId;

        let multiChange = changeGraph.get(key);
        if (!multiChange) {
          multiChange = {
            syncId: syncItem?.syncId,
            changes: new Map(),
          };
          changeGraph.set(key, multiChange);
        }

        multiChange.changes.set(backend.id, change);
      }
    }

    return changeGraph;
  }

  /**
   * Syncs a single item across all backends.
   * @private
   */
  private async syncItem(
    multiChange: MultiBackendChanges,
    stats: SyncStats,
    conflicts: SyncConflict[]
  ): Promise<void> {
    const changes = Array.from(multiChange.changes.values());

    // Categorize changes
    const creates = changes.filter((c) => c.changeType === 'created');
    const updates = changes.filter((c) => c.changeType === 'updated');
    const deletes = changes.filter((c) => c.changeType === 'deleted');

    // Case 1: All deletes - delete everywhere
    if (deletes.length === changes.length) {
      await this.handleDeleteAcrossAll(multiChange, stats);
      return;
    }

    // Case 2: Some deletes, some updates - conflict
    if (deletes.length > 0 && updates.length > 0) {
      // Resolve delete vs update conflict
      await this.handleDeleteUpdateConflict(multiChange, stats, conflicts);
      return;
    }

    // Case 3: Only creates - propagate to all backends
    if (creates.length === changes.length) {
      await this.handleCreateAcrossAll(multiChange, stats);
      return;
    }

    // Case 4: Mix of creates and updates - sync new item to all
    if (creates.length > 0) {
      await this.handleCreateAcrossAll(multiChange, stats);
      return;
    }

    // Case 5: Only updates - resolve conflicts and propagate
    if (updates.length > 0) {
      await this.handleUpdateAcrossAll(multiChange, stats, conflicts);
      return;
    }
  }

  /**
   * Handles creating an item across all backends.
   * @private
   */
  private async handleCreateAcrossAll(
    multiChange: MultiBackendChanges,
    stats: SyncStats
  ): Promise<void> {
    // Get the source change (first create)
    const sourceChange = Array.from(multiChange.changes.values()).find(
      (c) => c.changeType === 'created'
    );

    if (!sourceChange || !sourceChange.newValues) return;

    const sourceTask = sourceChange.newValues as Task;
    const sourceBackendId = sourceChange.sourceBackend;

    // Find source backend
    const sourceBackend = this.backends.find((b) => b.id === sourceBackendId);
    if (!sourceBackend) return;

    const backendIds: Record<string, string> = {};
    const versions: Record<string, string> = {};

    backendIds[sourceBackendId] = sourceTask.gid;
    versions[sourceBackendId] = this.changeDetector.computeItemHash(sourceTask);

    // Create in all other backends
    for (const backend of this.backends) {
      if (backend.id === sourceBackendId) continue;

      // Check if already exists in this backend
      if (multiChange.changes.has(backend.id)) continue;

      if (this.config.dryRun) {
        stats.itemsCreated++;
        continue;
      }

      try {
        const targetTask = await backend.backends.task.createTask(
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
          await backend.backends.task.updateTask(targetTask.gid, updates);
        }

        backendIds[backend.id] = targetTask.gid;
        versions[backend.id] = this.changeDetector.computeItemHash(targetTask);

        stats.itemsCreated++;
      } catch (error: any) {
        throw new Error(
          `Failed to create task in ${backend.name}: ${error.message}`
        );
      }
    }

    // Create or update sync state
    if (multiChange.syncId) {
      const syncItem = await this.stateManager.getSyncItem(multiChange.syncId);
      if (syncItem) {
        await this.stateManager.updateSyncItem(multiChange.syncId, {
          backendIds: { ...syncItem.backendIds, ...backendIds },
          versions: { ...syncItem.versions, ...versions },
        });
      }
    } else {
      await this.stateManager.createSyncItem(backendIds, versions);
    }
  }

  /**
   * Handles updating an item across all backends.
   * @private
   */
  private async handleUpdateAcrossAll(
    multiChange: MultiBackendChanges,
    stats: SyncStats,
    conflicts: SyncConflict[]
  ): Promise<void> {
    if (!multiChange.syncId) {
      // No sync state, treat as create
      await this.handleCreateAcrossAll(multiChange, stats);
      return;
    }

    const syncItem = await this.stateManager.getSyncItem(multiChange.syncId);
    if (!syncItem) {
      await this.handleCreateAcrossAll(multiChange, stats);
      return;
    }

    // Collect all changed tasks
    const tasks: Array<{ backendId: string; task: Task }> = [];
    for (const [backendId, change] of multiChange.changes.entries()) {
      if (change.newValues) {
        tasks.push({ backendId, task: change.newValues as Task });
      }
    }

    if (tasks.length === 0) return;

    // Detect conflicts between all changed versions
    const allConflicts: SyncConflict[] = [];
    const changedFields = new Set<string>();

    for (const change of multiChange.changes.values()) {
      if (change.changedFields) {
        change.changedFields.forEach((f) => changedFields.add(f));
      }
    }

    const fieldsArray = Array.from(changedFields);

    // Compare all pairs to detect conflicts
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = tasks[i]!;
        const task2 = tasks[j]!;

        const pairConflicts = this.conflictResolver.detectConflicts(
          task1.task,
          task2.task,
          fieldsArray,
          task1.backendId,
          task2.backendId
        );

        allConflicts.push(...pairConflicts);
      }
    }

    stats.conflictsDetected += allConflicts.length;
    conflicts.push(...allConflicts);

    // Resolve conflicts and merge
    let mergedTask = tasks[0]!.task;

    for (let i = 1; i < tasks.length; i++) {
      mergedTask = this.conflictResolver.mergeItems(
        mergedTask,
        tasks[i]!.task,
        tasks[0]!.backendId,
        tasks[i]!.backendId
      );
    }

    // Resolve any conflicts
    for (const conflict of allConflicts) {
      try {
        const resolvedValue = await this.conflictResolver.resolveConflict(
          conflict,
          this.config.conflictStrategy,
          this.config.callbacks?.onConflict
        );

        (mergedTask as any)[conflict.field] = resolvedValue;

        const resolved = this.conflictResolver.markResolved(
          conflict,
          resolvedValue,
          tasks[0]!.backendId
        );
        Object.assign(conflict, resolved);

        stats.conflictsResolved++;
      } catch (error) {
        // Conflict resolution failed
      }
    }

    // Apply merged task to all backends
    if (!this.config.dryRun) {
      for (const [backendId, itemId] of Object.entries(syncItem.backendIds)) {
        const backend = this.backends.find((b) => b.id === backendId);
        if (!backend) continue;

        try {
          await backend.backends.task.updateTask(itemId, mergedTask);
          stats.itemsUpdated++;
        } catch (error: any) {
          throw new Error(
            `Failed to update task in ${backend.name}: ${error.message}`
          );
        }
      }
    } else {
      stats.itemsUpdated += Object.keys(syncItem.backendIds).length;
    }

    // Update sync state
    const newVersions: Record<string, string> = {};
    for (const backendId of Object.keys(syncItem.backendIds)) {
      newVersions[backendId] = this.changeDetector.computeItemHash(mergedTask);
    }

    await this.stateManager.updateSyncItem(multiChange.syncId, {
      versions: newVersions,
      lastSyncTimes: Object.keys(syncItem.backendIds).reduce(
        (acc, id) => {
          acc[id] = new Date().toISOString();
          return acc;
        },
        {} as Record<string, string>
      ),
      hasConflicts: false,
    });
  }

  /**
   * Handles deleting an item from all backends.
   * @private
   */
  private async handleDeleteAcrossAll(
    multiChange: MultiBackendChanges,
    stats: SyncStats
  ): Promise<void> {
    if (!multiChange.syncId) {
      stats.itemsSkipped++;
      return;
    }

    const syncItem = await this.stateManager.getSyncItem(multiChange.syncId);
    if (!syncItem) {
      stats.itemsSkipped++;
      return;
    }

    if (this.config.dryRun) {
      stats.itemsDeleted += Object.keys(syncItem.backendIds).length;
      return;
    }

    // Delete from all backends
    for (const [backendId, itemId] of Object.entries(syncItem.backendIds)) {
      const backend = this.backends.find((b) => b.id === backendId);
      if (!backend) continue;

      try {
        await backend.backends.task.deleteTask(itemId);
        stats.itemsDeleted++;
      } catch (error) {
        // Item may already be deleted
      }
    }

    // Delete sync state
    await this.stateManager.deleteSyncItem(multiChange.syncId);
  }

  /**
   * Handles conflict between delete and update.
   * @private
   */
  private async handleDeleteUpdateConflict(
    multiChange: MultiBackendChanges,
    stats: SyncStats,
    conflicts: SyncConflict[]
  ): Promise<void> {
    // Based on strategy, either delete everywhere or keep the update
    if (this.config.conflictStrategy === 'source-wins') {
      // First change wins
      const firstChange = Array.from(multiChange.changes.values())[0];
      if (firstChange?.changeType === 'deleted') {
        await this.handleDeleteAcrossAll(multiChange, stats);
      } else {
        await this.handleUpdateAcrossAll(multiChange, stats, conflicts);
      }
    } else {
      // Prefer updates over deletes (keep data)
      await this.handleUpdateAcrossAll(multiChange, stats, conflicts);
    }
  }

  /**
   * Syncs related data across all backends.
   * @private
   */
  private async syncRelatedData(stats: SyncStats, errors: SyncError[]): Promise<void> {
    try {
      if (this.config.syncTags) {
        await this.syncTagsAcrossAll();
      }

      if (this.config.syncSections) {
        await this.syncSectionsAcrossAll();
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
   * Syncs tags across all backends.
   * @private
   */
  private async syncTagsAcrossAll(): Promise<void> {
    const allTags = await Promise.all(
      this.backends.map((b) => b.backends.tag.list())
    );

    // Collect all unique tag names
    const allTagNames = new Set<string>();
    for (const tags of allTags) {
      for (const tag of tags) {
        allTagNames.add(tag.name);
      }
    }

    // Ensure each backend has all tags
    for (let i = 0; i < this.backends.length; i++) {
      const backend = this.backends[i]!;
      const existingTags = new Set(allTags[i]!.map((t) => t.name));

      for (const tagName of allTagNames) {
        if (!existingTags.has(tagName) && !this.config.dryRun) {
          await backend.backends.tag.create(tagName);
        }
      }
    }
  }

  /**
   * Syncs sections across all backends.
   * @private
   */
  private async syncSectionsAcrossAll(): Promise<void> {
    const allSections = await Promise.all(
      this.backends.map((b) => b.backends.section.list())
    );

    // Collect all unique section names
    const allSectionNames = new Set<string>();
    for (const sections of allSections) {
      for (const section of sections) {
        allSectionNames.add(section.name);
      }
    }

    // Ensure each backend has all sections
    for (let i = 0; i < this.backends.length; i++) {
      const backend = this.backends[i]!;
      const existingSections = new Set(allSections[i]!.map((s) => s.name));

      for (const sectionName of allSectionNames) {
        if (!existingSections.has(sectionName) && !this.config.dryRun) {
          await backend.backends.section.create(sectionName);
        }
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
