/**
 * @digital-minion/program
 *
 * Program management abstraction layer for Digital Minion.
 * Provides organizational hierarchy (Entity → BU → Org → Team) and
 * function types (Matter, Project, Maintenance, Framework) with backend adapters.
 */

// Core types and domain models
export * from './core';

// Function types
export * from './functions/project';
export * from './functions/matter';
export * from './functions/maintenance';

// Framework (Control Frameworks)
export * from './framework';

// Standards system
export * from './standards';

// Adapters
export * from './adapters';

// Managers
export * from './managers';

// Main entry point
export * from './program-manager';

// Schema exports
export * from './schema';
