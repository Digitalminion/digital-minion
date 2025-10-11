/**
 * Sync Module
 *
 * Provides comprehensive synchronization capabilities between backends.
 * Supports one-way, two-way, and N-way sync with conflict resolution.
 *
 * @module sync
 */

// Export types
export * from './sync.types';

// Export core components
export { SyncStateManager } from './sync-state.manager';
export { ChangeDetector } from './change-detector';
export { ConflictResolver } from './conflict-resolver';

// Export sync engines
export { OneWaySyncEngine } from './one-way-sync.engine';
export { TwoWaySyncEngine } from './two-way-sync.engine';
export { NWaySyncEngine } from './n-way-sync.engine';

/**
 * Creates a sync engine based on configuration.
 *
 * @param config - Sync configuration
 * @param backends - Array of backends to sync
 * @param stateManager - Sync state manager instance
 * @returns Appropriate sync engine instance
 */
import { SyncConfig, SyncBackend, SyncDirection } from './sync.types';
import { SyncStateManager } from './sync-state.manager';
import { OneWaySyncEngine } from './one-way-sync.engine';
import { TwoWaySyncEngine } from './two-way-sync.engine';
import { NWaySyncEngine } from './n-way-sync.engine';

export function createSyncEngine(
  config: SyncConfig,
  backends: SyncBackend[],
  stateManager: SyncStateManager
): OneWaySyncEngine | TwoWaySyncEngine | NWaySyncEngine {
  if (backends.length < 2) {
    throw new Error('At least 2 backends are required for sync');
  }

  switch (config.direction) {
    case SyncDirection.ONE_WAY:
      if (backends.length !== 2) {
        throw new Error('One-way sync requires exactly 2 backends (source and target)');
      }
      return new OneWaySyncEngine(
        backends[0]!,
        backends[1]!,
        stateManager,
        config
      );

    case SyncDirection.TWO_WAY:
      if (backends.length !== 2) {
        throw new Error('Two-way sync requires exactly 2 backends');
      }
      return new TwoWaySyncEngine(
        backends[0]!,
        backends[1]!,
        stateManager,
        config
      );

    case SyncDirection.N_WAY:
      return new NWaySyncEngine(backends, stateManager, config);

    default:
      throw new Error(`Unknown sync direction: ${config.direction}`);
  }
}

/**
 * Creates a sync state manager with the specified configuration.
 *
 * @param basePath - Base directory for sync state storage
 * @param syncPairId - Unique identifier for this sync pair/group
 * @returns Sync state manager instance
 */
export function createSyncStateManager(
  basePath: string,
  syncPairId: string
): SyncStateManager {
  return new SyncStateManager(basePath, syncPairId);
}

/**
 * Utility function to generate a sync pair ID from backend IDs.
 *
 * @param backendIds - Array of backend IDs
 * @returns Generated sync pair ID
 */
export function generateSyncPairId(backendIds: string[]): string {
  return backendIds.sort().join('-');
}

/**
 * Validates sync configuration.
 *
 * @param config - Sync configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateSyncConfig(config: SyncConfig): void {
  if (!config.direction) {
    throw new Error('Sync direction is required');
  }

  if (!config.conflictStrategy) {
    throw new Error('Conflict strategy is required');
  }

  if (
    config.conflictStrategy === 'manual' &&
    !config.callbacks?.onConflict
  ) {
    throw new Error('Manual conflict strategy requires onConflict callback');
  }

  if (config.batchSize !== undefined && config.batchSize < 1) {
    throw new Error('Batch size must be at least 1');
  }
}

/**
 * Example usage:
 *
 * ```typescript
 * import {
 *   createSyncEngine,
 *   createSyncStateManager,
 *   generateSyncPairId,
 *   SyncDirection,
 *   ConflictStrategy
 * } from '@digital-minion/lib/sync';
 *
 * // Create backends
 * const sourceBackend = {
 *   id: 'local',
 *   name: 'Local Storage',
 *   type: 'local',
 *   backends: localBackends
 * };
 *
 * const targetBackend = {
 *   id: 'asana',
 *   name: 'Asana',
 *   type: 'asana',
 *   backends: asanaBackends
 * };
 *
 * // Create state manager
 * const syncPairId = generateSyncPairId([sourceBackend.id, targetBackend.id]);
 * const stateManager = createSyncStateManager('./data', syncPairId);
 *
 * // Configure sync
 * const config = {
 *   direction: SyncDirection.TWO_WAY,
 *   conflictStrategy: ConflictStrategy.LAST_WRITE_WINS,
 *   syncTags: true,
 *   syncSections: true,
 *   dryRun: false,
 *   callbacks: {
 *     onProgress: (progress) => {
 *       console.log(`${progress.phase}: ${progress.percentage}%`);
 *     },
 *     onError: (error) => {
 *       console.error(`Error: ${error.message}`);
 *     }
 *   }
 * };
 *
 * // Create and run sync engine
 * const engine = createSyncEngine(config, [sourceBackend, targetBackend], stateManager);
 * const result = await engine.sync();
 *
 * console.log(`Sync completed: ${result.success}`);
 * console.log(`Items created: ${result.stats.itemsCreated}`);
 * console.log(`Items updated: ${result.stats.itemsUpdated}`);
 * console.log(`Conflicts: ${result.conflicts.length}`);
 * ```
 */
