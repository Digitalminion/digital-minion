/**
 * Core organizational hierarchy types for program management.
 *
 * Hierarchy: AdministrativeUnit → BusinessUnit → Organization → Team → Function
 */

/**
 * Function types represent different categories of work.
 */
export type FunctionType = 'matter' | 'project' | 'maintenance';

/**
 * AdministrativeUnit represents the highest level of organizational structure.
 * Typically maps to the company or top-level organization.
 *
 * Example: "Digital Minion" company
 */
export interface AdministrativeUnit {
  /** Unique identifier */
  id: string;

  /** Administrative unit name (e.g., "Digital Minion") */
  name: string;

  /** Optional description */
  description?: string;

  /** Business units within this administrative unit */
  businessUnits: BusinessUnit[];

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * BusinessUnit represents a major division within an administrative unit.
 *
 * Examples: "Corporate", "Management", "Engineering"
 */
export interface BusinessUnit {
  /** Unique identifier */
  id: string;

  /** Parent administrative unit ID */
  administrativeUnitId: string;

  /** Business unit name (e.g., "Corp", "Management") */
  name: string;

  /** Optional description */
  description?: string;

  /** Organizations within this business unit */
  organizations: Organization[];

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * Organization represents a functional group within a business unit.
 * Maps to "Workspace" in Asana terminology.
 *
 * Examples: "Global Information Security", "Product Engineering"
 */
export interface Organization {
  /** Unique identifier */
  id: string;

  /** Parent business unit ID */
  businessUnitId: string;

  /** Organization name (e.g., "Global Information Security") */
  name: string;

  /** Optional description */
  description?: string;

  /** Teams within this organization */
  teams: Team[];

  /** Backend mapping - workspace ID in Asana */
  workspaceId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * Team represents a working group within an organization.
 * Direct 1:1 mapping to "Team" in Asana.
 *
 * Examples: "Global Threat Management", "Security Operations"
 */
export interface Team {
  /** Unique identifier */
  id: string;

  /** Parent organization ID */
  organizationId: string;

  /** Team name (e.g., "Global Threat Management") */
  name: string;

  /** Optional description */
  description?: string;

  /** Backend mapping - team ID in Asana */
  teamId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * Context for program operations.
 * Carries the full organizational hierarchy for any operation.
 */
export interface ProgramContext {
  /** Current administrative unit */
  administrativeUnit: AdministrativeUnit;

  /** Current business unit */
  businessUnit: BusinessUnit;

  /** Current organization */
  organization: Organization;

  /** Current team */
  team: Team;

  /** Current function type (matter/project/maintenance) */
  functionType: FunctionType;

  /** Backend type being used */
  backendType: 'asana' | 'local' | 'custom';

  /** Backend project ID (if applicable) */
  projectId?: string;
}

/**
 * Base interface for all work items in the system.
 */
export interface WorkItem {
  /** Unique identifier */
  id: string;

  /** Work item name/title */
  name: string;

  /** Optional description */
  description?: string;

  /** Current status */
  status: string;

  /** Optional due date */
  dueDate?: string;

  /** Optional assignee */
  assignee?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Context this work belongs to */
  context: ProgramContext;

  /** Backend-specific ID for syncing */
  _backendId?: string;

  /** Backend type */
  _backendType?: 'asana' | 'local' | 'custom';

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}
