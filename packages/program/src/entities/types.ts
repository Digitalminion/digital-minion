/**
 * Entity types for the Digital Minion system.
 * Entities represent individual instances of people, agents, devices, and services.
 */

/**
 * Entity types supported by the system
 */
export type EntityType = 'person' | 'agent' | 'device' | 'service';

/**
 * Entity status
 */
export type EntityStatus = 'active' | 'inactive' | 'on-leave' | 'decommissioned';

/**
 * Person entity types
 */
export type PersonType = 'employee' | 'contractor' | 'volunteer';

/**
 * Common attribute types
 */
export type AttributeType = 'skill' | 'certification' | 'framework' | 'domain-knowledge';

/**
 * Attribute proficiency levels (1-5)
 * 1: Beginner, 2: Intermediate, 3: Advanced, 4: Expert, 5: Master
 */
export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Base entity interface - common fields for all entities
 */
export interface BaseEntity {
  /** Unique identifier */
  id: string;

  /** Entity name */
  name: string;

  /** Entity type */
  entityType: EntityType;

  /** Status */
  status: EntityStatus;

  /** Description */
  description?: string;

  /** Tags for categorization */
  tags?: string[];

  /** When entity was onboarded/created */
  onboarded_at: string;

  /** Last activity timestamp */
  last_active?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * Contact information
 */
export interface ContactInfo {
  email?: string;
  location?: string;
  timezone?: string;
}

/**
 * Attribute - skills, certifications, capabilities
 */
export interface Attribute {
  /** Attribute name */
  name: string;

  /** Attribute type */
  type: AttributeType;

  /** Proficiency level (for skills) */
  proficiency?: ProficiencyLevel;

  /** Validated flag (for certifications) */
  validated?: boolean;

  /** When attribute was acquired */
  acquired_at: string;

  /** Expiration date (for time-limited certifications) */
  expires_at?: string;

  /** Evidence links */
  evidence?: string[];

  /** Additional notes */
  notes?: string;
}

/**
 * Activity record - tracks actions over time
 */
export interface Activity {
  /** When action occurred */
  timestamp: string;

  /** Action performed */
  action: string;

  /** What was affected */
  target: string;

  /** Success status */
  success: boolean;

  /** Additional details */
  details?: Record<string, any>;
}

// ============================================================================
// PERSON ENTITY
// ============================================================================

/**
 * Person entity - represents a human team member
 */
export interface PersonEntity extends BaseEntity {
  entityType: 'person';

  /** Person type */
  personType: PersonType;

  /** Contact information */
  contact: ContactInfo;

  /** Reference to assigned position */
  positionId?: string;

  /** Person's attributes */
  attributes: Attribute[];

  /** Recent activities */
  activities?: Activity[];
}

// ============================================================================
// AGENT ENTITY
// ============================================================================

/**
 * AI Agent metadata
 */
export interface AIMetadata {
  /** AI model name */
  model: string;

  /** AI provider */
  provider: string;

  /** Max concurrent tasks */
  maxConcurrentTasks?: number;

  /** API endpoint */
  apiEndpoint?: string;

  /** Model version */
  modelVersion?: string;
}

/**
 * Agent entity - represents an AI agent
 */
export interface AgentEntity extends BaseEntity {
  entityType: 'agent';

  /** Contact information (typically cloud-based) */
  contact: ContactInfo;

  /** Reference to assigned position */
  positionId?: string;

  /** AI-specific metadata */
  aiMetadata: AIMetadata;

  /** Agent's capabilities as attributes */
  attributes: Attribute[];

  /** Recent activities */
  activities?: Activity[];
}

// ============================================================================
// DEVICE ENTITY
// ============================================================================

/**
 * Device types
 */
export type DeviceType =
  | 'workstation'
  | 'laptop'
  | 'server'
  | 'mobile'
  | 'iot'
  | 'network-device'
  | 'security-appliance';

/**
 * Device hardware specifications
 */
export interface DeviceHardware {
  /** CPU/Processor */
  cpu?: string;

  /** RAM in GB */
  memory?: number;

  /** Storage in GB */
  storage?: number;

  /** Operating system */
  os?: string;

  /** OS version */
  osVersion?: string;

  /** Serial number */
  serialNumber?: string;

  /** Asset tag */
  assetTag?: string;
}

/**
 * Device network information
 */
export interface DeviceNetwork {
  /** Hostname */
  hostname?: string;

  /** IP address */
  ipAddress?: string;

  /** MAC address */
  macAddress?: string;

  /** Network segment */
  networkSegment?: string;

  /** DNS name */
  dnsName?: string;
}

/**
 * Device security information
 */
export interface DeviceSecurity {
  /** Is device encrypted */
  encrypted: boolean;

  /** Antivirus installed */
  antivirusInstalled?: boolean;

  /** EDR agent installed */
  edrAgentInstalled?: boolean;

  /** Last security scan */
  lastSecurityScan?: string;

  /** Compliance status */
  complianceStatus?: 'compliant' | 'non-compliant' | 'unknown';
}

/**
 * Device entity - represents physical or virtual devices
 */
export interface DeviceEntity extends BaseEntity {
  entityType: 'device';

  /** Device type */
  deviceType: DeviceType;

  /** Assigned owner (person or agent ID) */
  assignedTo?: string;

  /** Hardware specifications */
  hardware: DeviceHardware;

  /** Network information */
  network: DeviceNetwork;

  /** Security information */
  security: DeviceSecurity;

  /** Physical location */
  location?: string;

  /** Device capabilities/software as attributes */
  attributes: Attribute[];

  /** Recent activities */
  activities?: Activity[];
}

// ============================================================================
// SERVICE ENTITY
// ============================================================================

/**
 * Service types
 */
export type ServiceType =
  | 'api'
  | 'web-service'
  | 'database'
  | 'queue'
  | 'cache'
  | 'authentication'
  | 'monitoring'
  | 'logging'
  | 'storage';

/**
 * Service endpoint information
 */
export interface ServiceEndpoint {
  /** Service URL */
  url: string;

  /** Protocol (http, https, grpc, etc.) */
  protocol: string;

  /** Port number */
  port?: number;

  /** API version */
  version?: string;
}

/**
 * Service health status
 */
export type ServiceHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Service monitoring information
 */
export interface ServiceMonitoring {
  /** Health check URL */
  healthCheckUrl?: string;

  /** Current health status */
  healthStatus: ServiceHealth;

  /** Last health check */
  lastHealthCheck?: string;

  /** Uptime percentage */
  uptime?: number;

  /** Response time (ms) */
  responseTime?: number;
}

/**
 * Service deployment information
 */
export interface ServiceDeployment {
  /** Environment (dev, staging, production) */
  environment: string;

  /** Deployment platform */
  platform?: string;

  /** Container image */
  containerImage?: string;

  /** Deployed version */
  version?: string;

  /** Last deployment timestamp */
  lastDeployed?: string;

  /** Deployed by */
  deployedBy?: string;
}

/**
 * Service dependencies
 */
export interface ServiceDependency {
  /** Dependency service ID */
  serviceId: string;

  /** Dependency type */
  type: 'required' | 'optional';

  /** Dependency purpose */
  purpose?: string;
}

/**
 * Service entity - represents software services
 */
export interface ServiceEntity extends BaseEntity {
  entityType: 'service';

  /** Service type */
  serviceType: ServiceType;

  /** Service owner (person or team ID) */
  ownerId?: string;

  /** Service endpoints */
  endpoints: ServiceEndpoint[];

  /** Monitoring information */
  monitoring: ServiceMonitoring;

  /** Deployment information */
  deployment: ServiceDeployment;

  /** Service dependencies */
  dependencies?: ServiceDependency[];

  /** Service capabilities/APIs as attributes */
  attributes: Attribute[];

  /** Recent activities */
  activities?: Activity[];
}

// ============================================================================
// ENTITY REFERENCES AND MANIFEST
// ============================================================================

/**
 * Entity reference for manifest
 */
export interface EntityReference {
  id: string;
  name: string;
  entityType: EntityType;
  status: EntityStatus;
  path: string;
}

/**
 * Entity partition information
 */
export interface EntityPartition {
  entityType: EntityType;
  path: string;
  fileName: string;
}

/**
 * Entity manifest
 */
export interface EntityManifest {
  teamId: string;
  administrativeUnit: string;
  businessUnit: string;
  organization: string;
  team: string;
  stats: {
    totalPersons: number;
    totalAgents: number;
    totalDevices: number;
    totalServices: number;
  };
  discoveredEntities: {
    persons: EntityReference[];
    agents: EntityReference[];
    devices: EntityReference[];
    services: EntityReference[];
  };
  version: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// INPUT TYPES FOR CREATING ENTITIES
// ============================================================================

/**
 * Input for creating a person entity
 */
export interface CreatePersonInput {
  id: string;
  name: string;
  personType: PersonType;
  contact: ContactInfo;
  positionId?: string;
  description?: string;
  tags?: string[];
  attributes?: Attribute[];
}

/**
 * Input for creating an agent entity
 */
export interface CreateAgentInput {
  id: string;
  name: string;
  contact: ContactInfo;
  positionId?: string;
  aiMetadata: AIMetadata;
  description?: string;
  tags?: string[];
  attributes?: Attribute[];
}

/**
 * Input for creating a device entity
 */
export interface CreateDeviceInput {
  id: string;
  name: string;
  deviceType: DeviceType;
  assignedTo?: string;
  hardware: DeviceHardware;
  network: DeviceNetwork;
  security: DeviceSecurity;
  location?: string;
  description?: string;
  tags?: string[];
  attributes?: Attribute[];
}

/**
 * Input for creating a service entity
 */
export interface CreateServiceInput {
  id: string;
  name: string;
  serviceType: ServiceType;
  ownerId?: string;
  endpoints: ServiceEndpoint[];
  monitoring: ServiceMonitoring;
  deployment: ServiceDeployment;
  dependencies?: ServiceDependency[];
  description?: string;
  tags?: string[];
  attributes?: Attribute[];
}

/**
 * Union type for all entity types
 */
export type Entity = PersonEntity | AgentEntity | DeviceEntity | ServiceEntity;
