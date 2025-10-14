/**
 * Minion Schema Namespace
 *
 * Complete schema definition for Digital Minion Program Mode.
 *
 * Namespaces:
 * - entity: Organizational hierarchy (AdministrativeUnit, BusinessUnit, Organization, Team)
 * - standard: Core types and interfaces (WorkItem, ProgramContext, common utilities)
 * - function: Function-specific types (Matter, Project, Maintenance)
 * - framework: Infrastructure types (Adapters, Managers, Backend integration)
 *
 * Usage:
 *   import { entity, standard, function as fn, framework } from '@digital-minion/program/schema/minion';
 *
 * Or import specific types:
 *   import { AdministrativeUnit, Project, IProjectManager } from '@digital-minion/program/schema/minion';
 */

// Entity namespace
import * as entity from './entity';

// Standard namespace
import * as standard from './standard';

// Function namespace
import * as functionTypes from './function';

// Framework namespace
import * as framework from './framework';

// Export namespaces
export { entity, standard, framework };

// Export function namespace with alias to avoid reserved keyword
export { functionTypes as function };

// Re-export all types for convenience
export * from './entity';
export * from './standard';
export * from './function';
export * from './framework';

/**
 * Schema version for compatibility checking
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Schema metadata
 */
export const SCHEMA_METADATA = {
  version: SCHEMA_VERSION,
  namespaces: ['entity', 'standard', 'function', 'framework'],
  description: 'Digital Minion Program Mode Schema',
  lastUpdated: '2025-10-11',
};
