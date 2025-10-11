/**
 * Sync State Manager
 *
 * Manages sync state and ID mappings between backends using JSONL storage.
 * Tracks the synchronization state of items across different backends and
 * maintains bidirectional ID mappings.
 */

import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SyncItemState, IdMapping } from './sync.types';

/**
 * Manages sync state persistence and ID mapping between backends.
 *
 * Storage structure:
 * - {basePath}/sync-state/{syncPairId}/sync-items.jsonl
 * - {basePath}/sync-state/{syncPairId}/id-mappings.jsonl
 */
export class SyncStateManager {
  private syncItemsStorage: JsonlRowStorage<SyncItemState>;
  private idMappingsStorage: JsonlRowStorage<IdMapping>;
  private syncItemsPath: string;
  private idMappingsPath: string;

  // In-memory caches for performance
  private syncItemsCache: Map<string, SyncItemState> = new Map();
  private idMappingsCache: Map<string, IdMapping> = new Map();
  private cacheLoaded = false;

  /**
   * Creates a new sync state manager.
   *
   * @param basePath - Base directory for sync state storage
   * @param syncPairId - Unique identifier for this sync pair/group
   */
  constructor(
    private basePath: string,
    private syncPairId: string
  ) {
    const syncStateDir = join(basePath, 'sync-state', syncPairId);
    this.syncItemsPath = join(syncStateDir, 'sync-items.jsonl');
    this.idMappingsPath = join(syncStateDir, 'id-mappings.jsonl');

    this.syncItemsStorage = new JsonlRowStorage<SyncItemState>();
    this.idMappingsStorage = new JsonlRowStorage<IdMapping>();
  }

  /**
   * Loads all sync state into memory cache.
   * Called automatically on first access.
   */
  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

    try {
      // Load sync items
      const syncItems = await this.syncItemsStorage.readAll(this.syncItemsPath);
      for (const item of syncItems) {
        this.syncItemsCache.set(item.syncId, item);
      }

      // Load ID mappings
      const mappings = await this.idMappingsStorage.readAll(this.idMappingsPath);
      for (const mapping of mappings) {
        const key = this.getMappingKey(
          mapping.sourceBackend,
          mapping.sourceId,
          mapping.targetBackend
        );
        this.idMappingsCache.set(key, mapping);
      }

      this.cacheLoaded = true;
    } catch (error: any) {
      throw new Error(`Failed to load sync state cache: ${error.message}`);
    }
  }

  /**
   * Gets sync state for a specific item.
   *
   * @param syncId - The sync ID to look up
   * @returns Sync item state or undefined if not found
   */
  async getSyncItem(syncId: string): Promise<SyncItemState | undefined> {
    await this.loadCache();
    return this.syncItemsCache.get(syncId);
  }

  /**
   * Creates a new sync item with the specified backend IDs.
   *
   * @param backendIds - Map of backend ID to item ID in that backend
   * @param versions - Map of backend ID to item version/hash
   * @returns The sync ID of the created item
   */
  async createSyncItem(
    backendIds: Record<string, string>,
    versions: Record<string, string>
  ): Promise<string> {
    await this.loadCache();

    const now = new Date().toISOString();
    const syncId = uuidv4();

    const lastSyncTimes: Record<string, string> = {};
    for (const backendId of Object.keys(backendIds)) {
      lastSyncTimes[backendId] = now;
    }

    const syncItem: SyncItemState = {
      syncId,
      backendIds,
      lastSyncTimes,
      versions,
      createdAt: now,
      updatedAt: now,
    };

    // Update cache
    this.syncItemsCache.set(syncId, syncItem);

    // Persist to storage
    try {
      await this.syncItemsStorage.appendRow(this.syncItemsPath, syncItem);
    } catch (error: any) {
      // Rollback cache on failure
      this.syncItemsCache.delete(syncId);
      throw new Error(`Failed to create sync item: ${error.message}`);
    }

    // Create ID mappings for all backend pairs
    await this.createMappingsForItem(syncItem);

    return syncId;
  }

  /**
   * Updates an existing sync item.
   *
   * @param syncId - The sync ID to update
   * @param updates - Partial updates to apply
   * @returns The updated sync item state
   */
  async updateSyncItem(
    syncId: string,
    updates: Partial<SyncItemState>
  ): Promise<SyncItemState> {
    await this.loadCache();

    const existing = this.syncItemsCache.get(syncId);
    if (!existing) {
      throw new Error(`Sync item not found: ${syncId}`);
    }

    const updated: SyncItemState = {
      ...existing,
      ...updates,
      syncId, // Ensure syncId is never changed
      updatedAt: new Date().toISOString(),
    };

    // Update cache
    this.syncItemsCache.set(syncId, updated);

    // Rebuild storage file with updated item
    try {
      const allItems = Array.from(this.syncItemsCache.values());
      await this.syncItemsStorage.writeAll(this.syncItemsPath, allItems);
    } catch (error: any) {
      // Rollback cache on failure
      this.syncItemsCache.set(syncId, existing);
      throw new Error(`Failed to update sync item: ${error.message}`);
    }

    // Update mappings if backend IDs changed
    if (updates.backendIds) {
      await this.updateMappingsForItem(updated);
    }

    return updated;
  }

  /**
   * Gets the target ID for a mapping.
   *
   * @param sourceBackend - Source backend ID
   * @param sourceId - Source item ID
   * @param targetBackend - Target backend ID
   * @returns Target ID or undefined if mapping doesn't exist
   */
  async getIdMapping(
    sourceBackend: string,
    sourceId: string,
    targetBackend: string
  ): Promise<string | undefined> {
    await this.loadCache();

    const key = this.getMappingKey(sourceBackend, sourceId, targetBackend);
    const mapping = this.idMappingsCache.get(key);
    return mapping?.targetId;
  }

  /**
   * Creates a new ID mapping (bidirectional).
   *
   * @param sourceBackend - Source backend ID
   * @param sourceId - Source item ID
   * @param targetBackend - Target backend ID
   * @param targetId - Target item ID
   * @param syncId - Optional sync ID to associate with
   * @returns The created mapping
   */
  async createIdMapping(
    sourceBackend: string,
    sourceId: string,
    targetBackend: string,
    targetId: string,
    syncId?: string
  ): Promise<IdMapping> {
    await this.loadCache();

    const now = new Date().toISOString();
    const usedSyncId = syncId || uuidv4();

    // Create forward mapping (source -> target)
    const forwardMapping: IdMapping = {
      syncId: usedSyncId,
      sourceBackend,
      sourceId,
      targetBackend,
      targetId,
      createdAt: now,
      lastVerifiedAt: now,
    };

    // Create reverse mapping (target -> source)
    const reverseMapping: IdMapping = {
      syncId: usedSyncId,
      sourceBackend: targetBackend,
      sourceId: targetId,
      targetBackend: sourceBackend,
      targetId: sourceId,
      createdAt: now,
      lastVerifiedAt: now,
    };

    const forwardKey = this.getMappingKey(sourceBackend, sourceId, targetBackend);
    const reverseKey = this.getMappingKey(targetBackend, targetId, sourceBackend);

    // Update cache
    this.idMappingsCache.set(forwardKey, forwardMapping);
    this.idMappingsCache.set(reverseKey, reverseMapping);

    // Persist to storage
    try {
      await this.idMappingsStorage.appendRow(this.idMappingsPath, forwardMapping);
      await this.idMappingsStorage.appendRow(this.idMappingsPath, reverseMapping);
    } catch (error: any) {
      // Rollback cache on failure
      this.idMappingsCache.delete(forwardKey);
      this.idMappingsCache.delete(reverseKey);
      throw new Error(`Failed to create ID mapping: ${error.message}`);
    }

    return forwardMapping;
  }

  /**
   * Gets all sync items.
   *
   * @returns Array of all sync items
   */
  async getAllSyncItems(): Promise<SyncItemState[]> {
    await this.loadCache();
    return Array.from(this.syncItemsCache.values());
  }

  /**
   * Gets all sync items that involve a specific backend.
   *
   * @param backendId - Backend ID to filter by
   * @returns Array of sync items for the backend
   */
  async getSyncItemsByBackend(backendId: string): Promise<SyncItemState[]> {
    await this.loadCache();

    const items: SyncItemState[] = [];
    for (const item of this.syncItemsCache.values()) {
      if (item.backendIds[backendId]) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Finds a sync item by backend ID and item ID.
   *
   * @param backendId - Backend ID
   * @param itemId - Item ID in that backend
   * @returns Sync item state or undefined if not found
   */
  async findSyncItemByBackendId(
    backendId: string,
    itemId: string
  ): Promise<SyncItemState | undefined> {
    await this.loadCache();

    for (const item of this.syncItemsCache.values()) {
      if (item.backendIds[backendId] === itemId) {
        return item;
      }
    }

    return undefined;
  }

  /**
   * Gets all ID mappings.
   *
   * @returns Array of all ID mappings
   */
  async getAllIdMappings(): Promise<IdMapping[]> {
    await this.loadCache();
    return Array.from(this.idMappingsCache.values());
  }

  /**
   * Deletes a sync item and its mappings.
   *
   * @param syncId - Sync ID to delete
   */
  async deleteSyncItem(syncId: string): Promise<void> {
    await this.loadCache();

    if (!this.syncItemsCache.has(syncId)) {
      throw new Error(`Sync item not found: ${syncId}`);
    }

    // Remove from cache
    this.syncItemsCache.delete(syncId);

    // Rebuild storage file without deleted item
    try {
      const allItems = Array.from(this.syncItemsCache.values());
      await this.syncItemsStorage.writeAll(this.syncItemsPath, allItems);
    } catch (error: any) {
      throw new Error(`Failed to delete sync item: ${error.message}`);
    }

    // Remove associated mappings
    const mappingsToDelete: string[] = [];
    for (const [key, mapping] of this.idMappingsCache.entries()) {
      if (mapping.syncId === syncId) {
        mappingsToDelete.push(key);
      }
    }

    for (const key of mappingsToDelete) {
      this.idMappingsCache.delete(key);
    }

    // Rebuild mappings storage
    if (mappingsToDelete.length > 0) {
      try {
        const allMappings = Array.from(this.idMappingsCache.values());
        await this.idMappingsStorage.writeAll(this.idMappingsPath, allMappings);
      } catch (error: any) {
        throw new Error(`Failed to delete sync item mappings: ${error.message}`);
      }
    }
  }

  /**
   * Clears all sync state (use with caution).
   */
  async clearAll(): Promise<void> {
    this.syncItemsCache.clear();
    this.idMappingsCache.clear();
    this.cacheLoaded = false;

    await this.syncItemsStorage.writeAll(this.syncItemsPath, []);
    await this.idMappingsStorage.writeAll(this.idMappingsPath, []);
  }

  /**
   * Creates ID mappings for all backend pairs in a sync item.
   * @private
   */
  private async createMappingsForItem(syncItem: SyncItemState): Promise<void> {
    const backends = Object.keys(syncItem.backendIds);

    // Create bidirectional mappings between all backend pairs
    for (let i = 0; i < backends.length; i++) {
      for (let j = 0; j < backends.length; j++) {
        if (i !== j) {
          const sourceBackend = backends[i]!;
          const targetBackend = backends[j]!;
          const sourceId = syncItem.backendIds[sourceBackend]!;
          const targetId = syncItem.backendIds[targetBackend]!;

          await this.createIdMapping(
            sourceBackend,
            sourceId,
            targetBackend,
            targetId,
            syncItem.syncId
          );
        }
      }
    }
  }

  /**
   * Updates ID mappings when backend IDs change.
   * @private
   */
  private async updateMappingsForItem(syncItem: SyncItemState): Promise<void> {
    // Remove old mappings for this sync ID
    const mappingsToDelete: string[] = [];
    for (const [key, mapping] of this.idMappingsCache.entries()) {
      if (mapping.syncId === syncItem.syncId) {
        mappingsToDelete.push(key);
      }
    }

    for (const key of mappingsToDelete) {
      this.idMappingsCache.delete(key);
    }

    // Create new mappings
    await this.createMappingsForItem(syncItem);

    // Rebuild mappings storage
    try {
      const allMappings = Array.from(this.idMappingsCache.values());
      await this.idMappingsStorage.writeAll(this.idMappingsPath, allMappings);
    } catch (error: any) {
      throw new Error(`Failed to update mappings: ${error.message}`);
    }
  }

  /**
   * Generates a cache key for an ID mapping.
   * @private
   */
  private getMappingKey(
    sourceBackend: string,
    sourceId: string,
    targetBackend: string
  ): string {
    return `${sourceBackend}:${sourceId}:${targetBackend}`;
  }
}
