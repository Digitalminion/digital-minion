/**
 * @digital-minion/lib
 *
 * Core library for Digital Minion task management.
 * Provides reusable utilities, interfaces, and backend abstractions
 * for working with task management systems (Asana, local, etc.).
 *
 * Main exports:
 * - Backend abstractions (ITaskBackend, IConfigBackend, BackendFactory)
 * - Sync namespace (OneWaySyncEngine, TwoWaySyncEngine, NWaySyncEngine)
 * - Data types (Task, Tag, Section, User, etc.)
 * - Legacy client and types (for backwards compatibility)
 *
 * Usage:
 * ```typescript
 * // Backends
 * import { Backends } from '@digital-minion/lib';
 * const backends = Backends.BackendFactory.createAllBackends(config);
 *
 * // Sync
 * import { Sync } from '@digital-minion/lib';
 * const engine = Sync.createSyncEngine(config, backends, stateManager);
 * const result = await engine.sync();
 * ```
 */

// Export legacy types and client (for backwards compatibility)
export { TaskPriority, TaskStatus, Task, TaskFilter } from './types';
export { DigitalMinionClient } from './client';

// Export all backend abstractions under the Backends namespace
import * as Backends from './backends';
export { Backends };

// Export all sync components under the Sync namespace
import * as Sync from './sync';
export { Sync };
