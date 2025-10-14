/**
 * Control Framework Exports
 *
 * Re-exports all framework-related types and utilities for easy access.
 */

// Re-export schema types
export * from '../schema/minion/function/framework';

// Re-export manager
export * from '../managers/framework-manager';

// Re-export adapter interface
export type { IFrameworkAdapter, IFrameworkManager } from '../schema/minion/framework';

// Re-export setup utilities
export * from './setup';
