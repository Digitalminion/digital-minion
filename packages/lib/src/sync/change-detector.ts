/**
 * Change Detector
 *
 * Detects changes in tasks since the last sync operation.
 * Compares current state with last known state to identify created, updated,
 * and deleted items, as well as which specific fields changed.
 */

import { createHash } from 'crypto';
import { Task } from '../backends/core/types';
import { SyncBackend, ItemChange, SyncItemState } from './sync.types';
import { SyncStateManager } from './sync-state.manager';

/**
 * Detects changes in backend data for synchronization.
 */
export class ChangeDetector {
  constructor(private stateManager: SyncStateManager) {}

  /**
   * Detects all changes in a backend since last sync.
   *
   * @param backend - The backend to check for changes
   * @param lastSyncTime - Optional last sync timestamp
   * @returns Array of detected changes
   */
  async detectChanges(
    backend: SyncBackend,
    lastSyncTime?: string
  ): Promise<ItemChange[]> {
    const changes: ItemChange[] = [];

    try {
      // Get current tasks from backend
      const currentTasks = await backend.backends.task.listTasks();

      // Get all sync items for this backend
      const syncItems = await this.stateManager.getSyncItemsByBackend(backend.id);

      // Build a map of known items by backend ID
      const knownItemsMap = new Map<string, SyncItemState>();
      for (const syncItem of syncItems) {
        const itemId = syncItem.backendIds[backend.id];
        if (itemId) {
          knownItemsMap.set(itemId, syncItem);
        }
      }

      // Check each current task
      for (const task of currentTasks) {
        const syncItem = knownItemsMap.get(task.gid);

        if (!syncItem) {
          // New item - created since last sync
          changes.push({
            itemId: task.gid,
            changeType: 'created',
            sourceBackend: backend.id,
            newValues: task,
            detectedAt: new Date().toISOString(),
          });
        } else {
          // Existing item - check for updates
          const itemChange = await this.detectItemChange(
            task,
            syncItem.versions[backend.id]
          );

          if (itemChange) {
            changes.push({
              itemId: task.gid,
              changeType: 'updated',
              sourceBackend: backend.id,
              changedFields: itemChange.changedFields,
              oldValues: itemChange.oldValues,
              newValues: task,
              detectedAt: new Date().toISOString(),
            });
          }

          // Mark as seen
          knownItemsMap.delete(task.gid);
        }
      }

      // Remaining items in knownItemsMap were deleted
      for (const [itemId, syncItem] of knownItemsMap.entries()) {
        changes.push({
          itemId,
          changeType: 'deleted',
          sourceBackend: backend.id,
          oldValues: undefined, // We don't have the old data anymore
          detectedAt: new Date().toISOString(),
        });
      }

      return changes;
    } catch (error: any) {
      throw new Error(
        `Failed to detect changes in ${backend.name}: ${error.message}`
      );
    }
  }

  /**
   * Detects changes in a single item by comparing with last known version.
   *
   * @param item - Current item state
   * @param lastKnownVersion - Hash of last known version
   * @returns Change details if item changed, undefined otherwise
   */
  async detectItemChange(
    item: Task,
    lastKnownVersion?: string
  ): Promise<{ changedFields: string[]; oldValues: Partial<Task> } | undefined> {
    const currentHash = this.computeItemHash(item);

    // If hashes match, no changes
    if (currentHash === lastKnownVersion) {
      return undefined;
    }

    // Hash mismatch means something changed
    // Since we don't store the old item, we can't determine exact changed fields
    // Return all syncable fields as potentially changed
    const changedFields = this.getSyncableFields(item);

    return {
      changedFields,
      oldValues: {}, // We don't have old values without storing them
    };
  }

  /**
   * Computes a hash for an item for change detection.
   *
   * @param item - The item to hash
   * @returns Hash string
   */
  computeItemHash(item: Task): string {
    // Create a normalized representation for hashing
    const normalized = this.normalizeItemForHashing(item);
    const json = JSON.stringify(normalized);
    return createHash('sha256').update(json).digest('hex');
  }

  /**
   * Detects specific field changes by comparing two items.
   *
   * @param oldItem - Previous item state
   * @param newItem - Current item state
   * @returns Array of field names that changed
   */
  detectFieldChanges(oldItem: Task, newItem: Task): string[] {
    const changedFields: string[] = [];
    const fields = this.getSyncableFields(newItem);

    for (const field of fields) {
      const oldValue = (oldItem as any)[field];
      const newValue = (newItem as any)[field];

      if (!this.valuesEqual(oldValue, newValue)) {
        changedFields.push(field);
      }
    }

    return changedFields;
  }

  /**
   * Gets the list of fields that should be synchronized.
   * @private
   */
  private getSyncableFields(item: Task): string[] {
    const fields: string[] = [
      'name',
      'notes',
      'completed',
      'dueOn',
      'startOn',
      'assignee',
      'assigneeGid',
      'tags',
      'parent',
      'priority',
      'isMilestone',
    ];

    // Only include fields that exist on the item
    return fields.filter((field) => (item as any)[field] !== undefined);
  }

  /**
   * Normalizes an item for consistent hashing.
   * @private
   */
  private normalizeItemForHashing(item: Task): any {
    const normalized: any = {
      gid: item.gid,
      name: item.name || '',
      notes: item.notes || '',
      completed: item.completed || false,
      dueOn: item.dueOn || null,
      startOn: item.startOn || null,
      assignee: item.assignee || null,
      assigneeGid: item.assigneeGid || null,
      priority: item.priority || null,
      isMilestone: item.isMilestone || false,
    };

    // Normalize arrays (sort for consistent ordering)
    if (item.tags) {
      normalized.tags = [...item.tags].sort();
    }

    if (item.dependencies) {
      normalized.dependencies = [...item.dependencies].sort();
    }

    if (item.dependents) {
      normalized.dependents = [...item.dependents].sort();
    }

    // Include parent relationship
    if (item.parent) {
      normalized.parent = item.parent;
    }

    // Include memberships (sections) in a normalized way
    if (item.memberships && item.memberships.length > 0) {
      normalized.sections = item.memberships
        .map((m) => m.section.gid)
        .sort();
    }

    return normalized;
  }

  /**
   * Compares two values for equality (handles arrays and objects).
   * @private
   */
  private valuesEqual(a: any, b: any): boolean {
    // Null/undefined check
    if (a === b) return true;
    if (a == null || b == null) return false;

    // Array comparison
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;

      const aSorted = [...a].sort();
      const bSorted = [...b].sort();

      for (let i = 0; i < aSorted.length; i++) {
        if (!this.valuesEqual(aSorted[i], bSorted[i])) {
          return false;
        }
      }

      return true;
    }

    // Object comparison (shallow)
    if (typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a).sort();
      const bKeys = Object.keys(b).sort();

      if (aKeys.length !== bKeys.length) return false;
      if (!this.valuesEqual(aKeys, bKeys)) return false;

      for (const key of aKeys) {
        if (!this.valuesEqual(a[key], b[key])) {
          return false;
        }
      }

      return true;
    }

    // Primitive comparison
    return a === b;
  }

  /**
   * Groups changes by change type.
   *
   * @param changes - Array of changes
   * @returns Object with changes grouped by type
   */
  groupChangesByType(changes: ItemChange[]): {
    created: ItemChange[];
    updated: ItemChange[];
    deleted: ItemChange[];
  } {
    return {
      created: changes.filter((c) => c.changeType === 'created'),
      updated: changes.filter((c) => c.changeType === 'updated'),
      deleted: changes.filter((c) => c.changeType === 'deleted'),
    };
  }

  /**
   * Filters changes based on modification time.
   *
   * @param changes - Array of changes
   * @param afterTime - ISO timestamp to filter after
   * @returns Filtered changes
   */
  filterChangesByTime(changes: ItemChange[], afterTime: string): ItemChange[] {
    const afterDate = new Date(afterTime);
    return changes.filter(
      (change) => new Date(change.detectedAt) > afterDate
    );
  }
}
