/**
 * Manager Module Exports
 *
 * Clean barrel exports for the refactored manager system
 */

// Services
export { ManagerCrudService } from './manager-crud.service';
export { ManagerHooksService } from './manager-hooks.service';
export { ManagerStatsService } from './manager-stats.service';
export type { BaseManagerStats } from './manager-stats.service';
export { ManagerNamespaceService } from './manager-namespace.service';

// Main facade (for backward compatibility)
export { BaseManager } from '../base.manager';
export type { BaseManagerConfig, ValidationResult, BaseManagerDependencies } from '../base.manager';
