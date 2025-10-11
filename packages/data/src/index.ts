/**
 * @digital-minion/data
 *
 * Comprehensive data storage and management system for Digital Minion.
 *
 * This package provides:
 * - JSON-based storage (object and row-based)
 * - Namespace system with hierarchical partitions
 * - Data layer with map-reduce, caching, and indexing
 * - Repository and Manager patterns
 * - Query utilities
 */

// ===== Storage Layer =====
export * from './storage';

// ===== Namespace System =====
export * from './namespace';

// ===== Data Layer =====
// Note: DataLayer class is currently incomplete (missing PartitionManifestManager)
// Exporting types and adapters only
export * from './layer';

// ===== Operations =====
export * from './operations';

// ===== Patterns =====
export * from './patterns';
