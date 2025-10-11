/**
 * Conflict Resolver
 *
 * Resolves synchronization conflicts using various strategies.
 * Handles conflicts when the same item is modified in multiple backends.
 */

import { Task } from '../backends/core/types';
import { SyncConflict, ConflictStrategy } from './sync.types';

/**
 * Resolves conflicts between competing changes.
 */
export class ConflictResolver {
  /**
   * Resolves a single conflict using the specified strategy.
   *
   * @param conflict - The conflict to resolve
   * @param strategy - Resolution strategy to use
   * @param manualResolver - Optional callback for manual resolution
   * @returns The resolved value
   */
  async resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictStrategy,
    manualResolver?: (conflict: SyncConflict) => Promise<any>
  ): Promise<any> {
    switch (strategy) {
      case ConflictStrategy.SOURCE_WINS:
        return this.resolveSourceWins(conflict);

      case ConflictStrategy.TARGET_WINS:
        return this.resolveTargetWins(conflict);

      case ConflictStrategy.LAST_WRITE_WINS:
        return this.resolveLastWriteWins(conflict);

      case ConflictStrategy.FIRST_WRITE_WINS:
        return this.resolveFirstWriteWins(conflict);

      case ConflictStrategy.MANUAL:
        if (!manualResolver) {
          throw new Error(
            `Manual conflict resolution required for field "${conflict.field}" but no resolver provided`
          );
        }
        return await manualResolver(conflict);

      case ConflictStrategy.MERGE:
        return this.resolveMerge(conflict);

      default:
        throw new Error(`Unknown conflict strategy: ${strategy}`);
    }
  }

  /**
   * Detects conflicts between source and target items.
   *
   * @param sourceItem - Item from source backend
   * @param targetItem - Item from target backend
   * @param fields - Fields to check for conflicts
   * @param sourceBackend - Source backend ID
   * @param targetBackend - Target backend ID
   * @returns Array of detected conflicts
   */
  detectConflicts(
    sourceItem: Task,
    targetItem: Task,
    fields: string[],
    sourceBackend: string,
    targetBackend: string
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    const now = new Date().toISOString();

    for (const field of fields) {
      const sourceValue = (sourceItem as any)[field];
      const targetValue = (targetItem as any)[field];

      if (!this.valuesEqual(sourceValue, targetValue)) {
        const values: Record<string, any> = {};
        values[sourceBackend] = sourceValue;
        values[targetBackend] = targetValue;

        conflicts.push({
          field,
          values,
          detectedAt: now,
          strategy: ConflictStrategy.LAST_WRITE_WINS, // Default strategy
          resolved: false,
        });
      }
    }

    return conflicts;
  }

  /**
   * Merges two items when possible, using last-write-wins for conflicts.
   *
   * @param sourceItem - Item from source backend
   * @param targetItem - Item from target backend
   * @param sourceBackend - Source backend ID
   * @param targetBackend - Target backend ID
   * @returns Merged item
   */
  mergeItems(
    sourceItem: Task,
    targetItem: Task,
    sourceBackend: string,
    targetBackend: string
  ): Task {
    const merged = { ...targetItem };

    // Merge each field
    for (const field of Object.keys(sourceItem)) {
      const sourceValue = (sourceItem as any)[field];
      const targetValue = (targetItem as any)[field];

      if (sourceValue === undefined) continue;

      if (targetValue === undefined) {
        // Field only exists in source, copy it
        (merged as any)[field] = sourceValue;
      } else if (!this.valuesEqual(sourceValue, targetValue)) {
        // Conflict - use merge logic
        (merged as any)[field] = this.mergeValues(sourceValue, targetValue);
      }
    }

    return merged;
  }

  /**
   * Resolves conflict using SOURCE_WINS strategy.
   * @private
   */
  private resolveSourceWins(conflict: SyncConflict): any {
    const sourceBackend = Object.keys(conflict.values)[0];
    if (!sourceBackend) {
      throw new Error('No source backend found in conflict');
    }
    return conflict.values[sourceBackend];
  }

  /**
   * Resolves conflict using TARGET_WINS strategy.
   * @private
   */
  private resolveTargetWins(conflict: SyncConflict): any {
    const backends = Object.keys(conflict.values);
    if (backends.length < 2) {
      throw new Error('No target backend found in conflict');
    }
    const targetBackend = backends[1];
    return conflict.values[targetBackend!];
  }

  /**
   * Resolves conflict using LAST_WRITE_WINS strategy.
   * @private
   */
  private resolveLastWriteWins(conflict: SyncConflict): any {
    // Without modification timestamps, we use the first value as a fallback
    // In a real implementation, we'd compare timestamps
    const backends = Object.keys(conflict.values);
    return conflict.values[backends[0]!];
  }

  /**
   * Resolves conflict using FIRST_WRITE_WINS strategy.
   * @private
   */
  private resolveFirstWriteWins(conflict: SyncConflict): any {
    // Without modification timestamps, we use the first value
    const backends = Object.keys(conflict.values);
    return conflict.values[backends[0]!];
  }

  /**
   * Resolves conflict using MERGE strategy.
   * @private
   */
  private resolveMerge(conflict: SyncConflict): any {
    const values = Object.values(conflict.values);
    if (values.length === 0) {
      return undefined;
    }

    if (values.length === 1) {
      return values[0];
    }

    // Merge logic based on type
    const firstValue = values[0];
    const secondValue = values[1];

    return this.mergeValues(firstValue, secondValue);
  }

  /**
   * Merges two values based on their types.
   * @private
   */
  private mergeValues(a: any, b: any): any {
    // Null/undefined handling
    if (a == null) return b;
    if (b == null) return a;

    // Array merging - union of unique values
    if (Array.isArray(a) && Array.isArray(b)) {
      const merged = [...a];
      for (const item of b) {
        if (!merged.some((m) => this.valuesEqual(m, item))) {
          merged.push(item);
        }
      }
      return merged;
    }

    // Object merging - deep merge
    if (
      typeof a === 'object' &&
      typeof b === 'object' &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      const merged = { ...a };
      for (const key of Object.keys(b)) {
        if (merged[key] === undefined) {
          merged[key] = b[key];
        } else {
          merged[key] = this.mergeValues(merged[key], b[key]);
        }
      }
      return merged;
    }

    // String merging - concatenate if different
    if (typeof a === 'string' && typeof b === 'string') {
      if (a === b) return a;
      // For different strings, prefer the longer one (more information)
      return a.length >= b.length ? a : b;
    }

    // Number merging - prefer larger value
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.max(a, b);
    }

    // Boolean merging - prefer true (more permissive)
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a || b;
    }

    // Default: prefer first value (last-write-wins)
    return a;
  }

  /**
   * Compares two values for equality.
   * @private
   */
  private valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;

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

    return false;
  }

  /**
   * Marks a conflict as resolved.
   *
   * @param conflict - The conflict to mark as resolved
   * @param chosenValue - The value that was chosen
   * @param chosenBackend - The backend whose value was chosen
   * @returns Updated conflict with resolution
   */
  markResolved(
    conflict: SyncConflict,
    chosenValue: any,
    chosenBackend: string
  ): SyncConflict {
    return {
      ...conflict,
      resolved: true,
      resolution: {
        chosenValue,
        chosenBackend,
        resolvedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Checks if a conflict can be automatically resolved.
   *
   * @param conflict - The conflict to check
   * @param strategy - Resolution strategy
   * @returns True if can be auto-resolved
   */
  canAutoResolve(conflict: SyncConflict, strategy: ConflictStrategy): boolean {
    return strategy !== ConflictStrategy.MANUAL;
  }

  /**
   * Gets a summary of conflicts.
   *
   * @param conflicts - Array of conflicts
   * @returns Summary object
   */
  getConflictSummary(conflicts: SyncConflict[]): {
    total: number;
    resolved: number;
    unresolved: number;
    byField: Record<string, number>;
  } {
    const summary = {
      total: conflicts.length,
      resolved: conflicts.filter((c) => c.resolved).length,
      unresolved: conflicts.filter((c) => !c.resolved).length,
      byField: {} as Record<string, number>,
    };

    for (const conflict of conflicts) {
      summary.byField[conflict.field] =
        (summary.byField[conflict.field] || 0) + 1;
    }

    return summary;
  }
}
