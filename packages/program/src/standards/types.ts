/**
 * Standards System Types
 *
 * Defines Policy, Role, Position, and Method standards that govern entity permissions,
 * capabilities, and quality requirements within the organization.
 */

import type { MethodReference } from './methods/types';

/**
 * Effect type for policy statements
 */
export type PolicyEffect = 'Allow' | 'Deny' | 'Warn';

/**
 * Policy statement defining permissions
 */
export interface PolicyStatement {
  /** Allow, Deny, or Warn */
  effect: PolicyEffect;

  /** Actions allowed/denied (e.g., "create:typescript:*", "read:*:*") */
  actions: string[];

  /** Resources affected (glob patterns) */
  resources: string[];

  /** Human-readable explanation of this statement */
  language: string;

  /** Optional conditions for when this statement applies */
  conditions?: Record<string, any>;
}

/**
 * Policy defines granular permission rules
 * Stored in: standard=policy/scope={type}/domain={function}/
 */
export interface Policy {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Version number for tracking changes */
  version: number;

  /** Scope type (filesystem, api, service, account) */
  scope: PolicyScope;

  /** Functional domain (testing, development, documentation, security, etc.) */
  domain: PolicyDomain;

  /** Policy statements */
  statements: PolicyStatement[];

  /** Optional description */
  description?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Policy scope - what type of resources this policy governs
 */
export type PolicyScope =
  | 'filesystem'    // File system access
  | 'api'           // API endpoint access
  | 'service'       // Service/infrastructure access
  | 'account'       // Account/team management
  | 'deployment'    // Deployment operations
  | 'data'          // Data access
  | string;         // Allow custom scopes

/**
 * Policy domain - functional area this policy applies to
 */
export type PolicyDomain =
  | 'testing'
  | 'development'
  | 'documentation'
  | 'security'
  | 'deployment'
  | 'management'
  | 'infrastructure'
  | 'review'
  | string;         // Allow custom domains

/**
 * Role defines functional capability with inheritance
 * Stored in: standard=role/domain={function}/level={progression}/
 */
export interface Role {
  /** Unique identifier */
  id: string;

  /** Human-readable name (e.g., "Testing", "AdvancedDevelopment") */
  name: string;

  /** Version number for tracking changes */
  version: number;

  /** Functional domain */
  domain: RoleDomain;

  /** Progression level */
  level: RoleLevel;

  /** Parent role ID for inheritance (null if no parent) */
  extends: string | null;

  /** Policy IDs that apply to this role */
  policies: string[];

  /** Method subject IDs from MethodManifest */
  methods: string[];

  /** Optional description */
  description?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Role domain - functional area of capability
 */
export type RoleDomain =
  | 'testing'
  | 'development'
  | 'documentation'
  | 'security'
  | 'review'
  | 'deployment'
  | 'infrastructure'
  | 'architecture'
  | 'management'
  | string;         // Allow custom domains

/**
 * Role level - progression within domain
 */
export type RoleLevel =
  | 'basic'         // Entry level, limited access
  | 'standard'      // Independent work, standard access
  | 'advanced'      // Senior level, elevated access
  | 'oversight'     // Management level, team leadership
  | 'owner'         // Full domain ownership
  | string;         // Allow custom levels

/**
 * Position defines a reusable job/role that combines multiple roles
 * Stored in: standard=position/track={career}/
 */
export interface Position {
  /** Unique identifier */
  id: string;

  /** Human-readable job title (e.g., "Senior QA Engineer", "Tech Lead") */
  title: string;

  /** Version number for tracking changes */
  version: number;

  /** Career track */
  track: PositionTrack;

  /** Role IDs that compose this position */
  roles: string[];

  /** Method subject IDs (combined from roles + additional) */
  methods: string[];

  /** Required attributes for entities in this position */
  requiredAttributes: AttributeRequirement[];

  /** Optional description */
  description?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Position track - career progression path
 */
export type PositionTrack =
  | 'engineering'     // Software engineering positions
  | 'quality'         // Quality assurance positions
  | 'documentation'   // Documentation positions
  | 'architecture'    // Architecture positions
  | 'security'        // Security positions
  | 'operations'      // Operations/DevOps positions
  | 'management'      // Management positions
  | 'automation'      // Automation/process positions
  | 'services'        // Service/infrastructure positions
  | string;           // Allow custom tracks

/**
 * Attribute requirement for positions
 */
export interface AttributeRequirement {
  /** Attribute name (e.g., "Jest", "TypeScript", "System Design") */
  name: string;

  /** Attribute type */
  type: AttributeType;

  /** Minimum proficiency level (1-5) for skills */
  minProficiency?: number;

  /** Whether certification must be validated */
  mustBeValidated?: boolean;

  /** Optional description */
  description?: string;
}

/**
 * Attribute type
 */
export type AttributeType =
  | 'skill'
  | 'certification'
  | 'framework'
  | 'domain-knowledge'
  | 'tool'
  | string;

/**
 * Standard type union
 */
export type Standard = Policy | Role | Position;

/**
 * Standard type discriminator
 */
export type StandardType = 'policy' | 'role' | 'position';

/**
 * Input for creating a new policy
 */
export interface CreatePolicyInput {
  name: string;
  scope: PolicyScope;
  domain: PolicyDomain;
  statements: PolicyStatement[];
  description?: string;
}

/**
 * Input for creating a new role
 */
export interface CreateRoleInput {
  name: string;
  domain: RoleDomain;
  level: RoleLevel;
  extends?: string | null;
  policies: string[];
  methods: string[];
  description?: string;
}

/**
 * Input for creating a new position
 */
export interface CreatePositionInput {
  title: string;
  track: PositionTrack;
  roles: string[];
  methods: string[];
  requiredAttributes: AttributeRequirement[];
  description?: string;
}

/**
 * Resolved standard with full hierarchy
 */
export interface ResolvedRole extends Role {
  /** All policies from this role and parents */
  allPolicies: Policy[];

  /** All methods from this role and parents */
  allMethods: string[];

  /** Full inheritance chain */
  inheritanceChain: Role[];
}

/**
 * Resolved position with full role and policy data
 */
export interface ResolvedPosition extends Position {
  /** Resolved roles with full data */
  resolvedRoles: ResolvedRole[];

  /** All policies from all roles */
  allPolicies: Policy[];

  /** All methods from all roles */
  allMethods: string[];
}

/**
 * Access check request
 */
export interface AccessCheckRequest {
  /** Entity ID requesting access */
  entityId: string;

  /** Action being requested (e.g., "create:typescript:class") */
  action: string;

  /** Resource being accessed */
  resource: string;

  /** Optional context for conditional policies */
  context?: Record<string, any>;
}

/**
 * Access check result
 */
export interface AccessCheckResult {
  /** Whether access is allowed */
  allowed: boolean;

  /** Effect that determined the result */
  effect: PolicyEffect;

  /** Matching statements */
  matchingStatements: PolicyStatement[];

  /** Warnings (if effect is Warn) */
  warnings?: string[];

  /** Reason for decision */
  reason: string;

  /** Policy that made the decision */
  decidingPolicy?: string;
}

/**
 * Standards manifest for a team
 * Stored in: standard.manifest.json
 */
export interface StandardsManifest {
  /** Team identifier */
  teamId: string;

  /** Organization hierarchy */
  administrativeUnit: string;
  businessUnit: string;
  organization: string;
  team: string;

  /** Total counts */
  stats: {
    totalPolicies: number;
    totalRoles: number;
    totalPositions: number;
    totalMethods: number;
  };

  /** Discovered standards */
  discoveredStandards: {
    policies: PolicyReference[];
    roles: RoleReference[];
    positions: PositionReference[];
    methods: MethodReference[];
  };

  /** Metadata */
  version: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Policy reference in manifest
 */
export interface PolicyReference {
  id: string;
  name: string;
  scope: PolicyScope;
  domain: PolicyDomain;
  version: number;
  path: string;
}

/**
 * Role reference in manifest
 */
export interface RoleReference {
  id: string;
  name: string;
  domain: RoleDomain;
  level: RoleLevel;
  version: number;
  path: string;
}

/**
 * Position reference in manifest
 */
export interface PositionReference {
  id: string;
  title: string;
  track: PositionTrack;
  version: number;
  path: string;
}
