/**
 * @digital-minion/lib
 *
 * Core library for Digital Minion task management.
 * Provides reusable utilities, interfaces, and backend abstractions
 * for working with task management systems (Asana, local, etc.).
 *
 * Main exports:
 * - Backend abstractions (ITaskBackend, IConfigBackend, BackendFactory)
 * - Data types (Task, Tag, Section, User, etc.)
 * - Legacy client and types (for backwards compatibility)
 *
 * Usage:
 * ```typescript
 * import { Backends } from '@digital-minion/lib';
 * const backends = Backends.BackendFactory.createAllBackends(config);
 * ```
 */

// Export legacy types and client (for backwards compatibility)
export { TaskPriority, TaskStatus, Task, TaskFilter } from './types';
export { DigitalMinionClient } from './client';

// Export all backend abstractions under the Backends namespace
import * as Backends from './backends';
export { Backends };
