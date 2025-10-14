/**
 * Function Schema Namespace
 *
 * Exports all function-specific schemas:
 * - Matter: Incidents, requests, reactive work
 * - Project: Planned work with features and stages
 * - Maintenance: Recurring scheduled tasks
 * - Framework: Control frameworks and compliance management
 */

// Matter exports
export * from './matter';

// Project exports
export * from './project';

// Maintenance exports
export * from './maintenance';

// Framework exports
export * from './framework';

/**
 * Union type of all function-specific work items
 */
import { Matter } from './matter';
import { Project } from './project';
import { MaintenanceProcess } from './maintenance';
import { ControlFramework } from './framework';

export type FunctionWorkItem = Matter | Project | MaintenanceProcess | ControlFramework;
