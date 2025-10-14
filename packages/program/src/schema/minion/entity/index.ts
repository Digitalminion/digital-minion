/**
 * Entity Schema Namespace
 *
 * Defines organizational hierarchy types for Digital Minion.
 * These types represent the structural organization of work across
 * administrative units, business units, organizations, and teams.
 *
 * Hierarchy:
 *   AdministrativeUnit → BusinessUnit → Organization → Team
 */

/**
 * AdministrativeUnit represents the highest level of organizational structure.
 * Typically maps to the company or top-level organization.
 *
 * Example: "Digital Minion" company
 */
export interface AdministrativeUnit {
  /** Unique identifier for the administrative unit */
  id: string;

  /** Administrative unit name (e.g., "Digital Minion") */
  name: string;

  /** Detailed description of the administrative unit */
  description?: string;

  /** Business units within this administrative unit */
  businessUnits: BusinessUnit[];

  /** Metadata */
  metadata: EntityMetadata;
}

/**
 * BusinessUnit represents a major division within an administrative unit.
 *
 * Examples: "Corporate", "Management", "Engineering"
 */
export interface BusinessUnit {
  /** Unique identifier for the business unit */
  id: string;

  /** Parent administrative unit ID */
  administrativeUnitId: string;

  /** Business unit name (e.g., "Corp", "Management") */
  name: string;

  /** Detailed description of the business unit */
  description?: string;

  /** Organizations within this business unit */
  organizations: Organization[];

  /** Metadata */
  metadata: EntityMetadata;
}

/**
 * Organization represents a functional group within a business unit.
 * Maps to "Workspace" in Asana terminology.
 *
 * Examples: "Global Information Security", "Product Engineering"
 */
export interface Organization {
  /** Unique identifier for the organization */
  id: string;

  /** Parent business unit ID */
  businessUnitId: string;

  /** Organization name (e.g., "Global Information Security") */
  name: string;

  /** Detailed description of the organization */
  description?: string;

  /** Teams within this organization */
  teams: Team[];

  /** Backend mapping - workspace ID in Asana (optional) */
  workspaceId?: string;

  /** Metadata */
  metadata: EntityMetadata;
}

/**
 * Team represents a working group within an organization.
 * Direct 1:1 mapping to "Team" in Asana.
 *
 * Examples: "Global Threat Management", "Security Operations"
 */
export interface Team {
  /** Unique identifier for the team */
  id: string;

  /** Parent organization ID */
  organizationId: string;

  /** Team name (e.g., "Global Threat Management") */
  name: string;

  /** Detailed description of the team */
  description?: string;

  /** Team members */
  members?: TeamMember[];

  /** Backend mapping - team ID in Asana (optional) */
  teamId?: string;

  /** Metadata */
  metadata: EntityMetadata;
}

/**
 * TeamMember represents an individual member of a team.
 */
export interface TeamMember {
  /** Unique identifier for the team member */
  id: string;

  /** Member's full name */
  name: string;

  /** Member's email address */
  email?: string;

  /** Member's role within the team */
  role?: string;

  /** Whether the member is active */
  active: boolean;

  /** Backend user ID (if applicable) */
  backendUserId?: string;
}

/**
 * EntityMetadata contains common metadata for all entity types.
 */
export interface EntityMetadata {
  /** When the entity was created (ISO 8601) */
  createdAt: string;

  /** When the entity was last updated (ISO 8601) */
  updatedAt: string;

  /** Who created the entity */
  createdBy?: string;

  /** Who last updated the entity */
  updatedBy?: string;

  /** Entity version for optimistic locking */
  version?: number;

  /** Custom properties for extensibility */
  customProperties?: Record<string, any>;
}

/**
 * EntityReference provides a lightweight reference to an entity.
 * Used when you need to reference an entity without loading its full data.
 */
export interface EntityReference<T extends 'administrative-unit' | 'business-unit' | 'organization' | 'team'> {
  /** Entity type */
  type: T;

  /** Entity ID */
  id: string;

  /** Entity name */
  name: string;
}

/**
 * EntityPath represents the full path through the organizational hierarchy.
 */
export interface EntityPath {
  /** Administrative unit reference */
  administrativeUnit: EntityReference<'administrative-unit'>;

  /** Business unit reference */
  businessUnit: EntityReference<'business-unit'>;

  /** Organization reference */
  organization: EntityReference<'organization'>;

  /** Team reference */
  team: EntityReference<'team'>;
}

/**
 * Input for creating a new administrative unit
 */
export interface CreateAdministrativeUnitInput {
  id: string;
  name: string;
  description?: string;
}

/**
 * Input for creating a new business unit
 */
export interface CreateBusinessUnitInput {
  id: string;
  administrativeUnitId: string;
  name: string;
  description?: string;
}

/**
 * Input for creating a new organization
 */
export interface CreateOrganizationInput {
  id: string;
  businessUnitId: string;
  name: string;
  description?: string;
  workspaceId?: string;
}

/**
 * Input for creating a new team
 */
export interface CreateTeamInput {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  teamId?: string;
}

/**
 * Input for adding a team member
 */
export interface AddTeamMemberInput {
  id: string;
  name: string;
  email?: string;
  role?: string;
  backendUserId?: string;
}
