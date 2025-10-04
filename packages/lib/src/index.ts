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
 * import { ITaskBackend, BackendFactory } from '@digital-minion/lib';
 * // or
 * import * as Backends from '@digital-minion/lib/backends';
 * ```
 */

export * from './types';
export * from './client';

// Export backend types separately to avoid conflicts
import * as Backends from './backends';
export { Backends };
