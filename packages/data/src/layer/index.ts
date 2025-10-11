/**
 * Data Layer Module
 *
 * Provides data layer abstractions and adapters for different storage backends.
 */

// Types
export * from './data.types';

// Adapters
export { JSONAdapter } from './adapters/json.adapter';
export { JSONLAdapter } from './adapters/jsonl.adapter';

// Partition Management
export { PartitionManifestManager } from './partition-manifest.manager';
export type { PartitionManifest, CreateManifestConfig } from './partition-manifest.manager';

// Data Layer
export { DataLayer } from './data.layer';
export type { DataLayerConfig } from './data.layer';
