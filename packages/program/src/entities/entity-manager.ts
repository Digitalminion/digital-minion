/**
 * Entity Manager
 * Manages entities (person, agent, device, service) with hash-based file naming.
 */

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join } from 'path';
import type {
  Entity,
  EntityType,
  EntityReference,
  EntityManifest,
  PersonEntity,
  AgentEntity,
  DeviceEntity,
  ServiceEntity,
  CreatePersonInput,
  CreateAgentInput,
  CreateDeviceInput,
  CreateServiceInput,
  Activity
} from './types';

export interface EntityManagerConfig {
  basePath: string;
  teamId: string;
  administrativeUnit: string;
  businessUnit: string;
  organization: string;
  team: string;
}

export class EntityManager {
  constructor(private config: EntityManagerConfig) {}

  /**
   * Hash a string to generate consistent file names
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get the data file name for a partition directory
   */
  private getDataFileName(partitionDir: string): string {
    const hash = this.hashString(partitionDir);
    return `data-${hash}.jsonl`;
  }

  /**
   * Get the partition directory path for an entity type
   */
  private getPartitionPath(entityType: EntityType): string {
    return join(
      this.config.basePath,
      `administrative_unit=${this.config.administrativeUnit}`,
      `business_unit=${this.config.businessUnit}`,
      `organization=${this.config.organization}`,
      `team=${this.config.team}`,
      `entity=${entityType}`
    );
  }

  /**
   * Read entities from a partition
   */
  private async readEntitiesFromPartition<T extends Entity>(
    entityType: EntityType
  ): Promise<T[]> {
    const partitionDir = this.getPartitionPath(entityType);

    try {
      const files = await readdir(partitionDir);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

      const entities: T[] = [];
      for (const file of jsonlFiles) {
        const filePath = join(partitionDir, file);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.length > 0);

        for (const line of lines) {
          try {
            const entity = JSON.parse(line) as T;
            entities.push(entity);
          } catch (err) {
            console.error(`Error parsing entity from ${file}:`, err);
          }
        }
      }

      return entities;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  /**
   * Write entities to a partition
   */
  private async writeEntitiesToPartition(
    entityType: EntityType,
    entities: Entity[]
  ): Promise<void> {
    const partitionDir = this.getPartitionPath(entityType);
    await mkdir(partitionDir, { recursive: true });

    const dataFile = this.getDataFileName(partitionDir);
    const filePath = join(partitionDir, dataFile);

    const lines = entities.map(entity => JSON.stringify(entity)).join('\n') + '\n';
    await writeFile(filePath, lines, 'utf-8');
  }

  // ============================================================================
  // PERSON ENTITY METHODS
  // ============================================================================

  /**
   * Create a person entity
   */
  async createPerson(input: CreatePersonInput): Promise<PersonEntity> {
    const now = new Date().toISOString();

    const person: PersonEntity = {
      id: input.id,
      name: input.name,
      entityType: 'person',
      personType: input.personType,
      contact: input.contact,
      positionId: input.positionId,
      status: 'active',
      description: input.description,
      tags: input.tags || [],
      attributes: input.attributes || [],
      onboarded_at: now,
      createdAt: now,
      updatedAt: now
    };

    const existingPersons = await this.readEntitiesFromPartition<PersonEntity>('person');
    existingPersons.push(person);
    await this.writeEntitiesToPartition('person', existingPersons);

    return person;
  }

  /**
   * Get all persons
   */
  async getPersons(): Promise<PersonEntity[]> {
    return this.readEntitiesFromPartition<PersonEntity>('person');
  }

  /**
   * Get a person by ID
   */
  async getPerson(id: string): Promise<PersonEntity | null> {
    const persons = await this.getPersons();
    return persons.find(p => p.id === id) || null;
  }

  // ============================================================================
  // AGENT ENTITY METHODS
  // ============================================================================

  /**
   * Create an agent entity
   */
  async createAgent(input: CreateAgentInput): Promise<AgentEntity> {
    const now = new Date().toISOString();

    const agent: AgentEntity = {
      id: input.id,
      name: input.name,
      entityType: 'agent',
      contact: input.contact,
      positionId: input.positionId,
      aiMetadata: input.aiMetadata,
      status: 'active',
      description: input.description,
      tags: input.tags || [],
      attributes: input.attributes || [],
      onboarded_at: now,
      createdAt: now,
      updatedAt: now
    };

    const existingAgents = await this.readEntitiesFromPartition<AgentEntity>('agent');
    existingAgents.push(agent);
    await this.writeEntitiesToPartition('agent', existingAgents);

    return agent;
  }

  /**
   * Get all agents
   */
  async getAgents(): Promise<AgentEntity[]> {
    return this.readEntitiesFromPartition<AgentEntity>('agent');
  }

  /**
   * Get an agent by ID
   */
  async getAgent(id: string): Promise<AgentEntity | null> {
    const agents = await this.getAgents();
    return agents.find(a => a.id === id) || null;
  }

  // ============================================================================
  // DEVICE ENTITY METHODS
  // ============================================================================

  /**
   * Create a device entity
   */
  async createDevice(input: CreateDeviceInput): Promise<DeviceEntity> {
    const now = new Date().toISOString();

    const device: DeviceEntity = {
      id: input.id,
      name: input.name,
      entityType: 'device',
      deviceType: input.deviceType,
      assignedTo: input.assignedTo,
      hardware: input.hardware,
      network: input.network,
      security: input.security,
      location: input.location,
      status: 'active',
      description: input.description,
      tags: input.tags || [],
      attributes: input.attributes || [],
      onboarded_at: now,
      createdAt: now,
      updatedAt: now
    };

    const existingDevices = await this.readEntitiesFromPartition<DeviceEntity>('device');
    existingDevices.push(device);
    await this.writeEntitiesToPartition('device', existingDevices);

    return device;
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<DeviceEntity[]> {
    return this.readEntitiesFromPartition<DeviceEntity>('device');
  }

  /**
   * Get a device by ID
   */
  async getDevice(id: string): Promise<DeviceEntity | null> {
    const devices = await this.getDevices();
    return devices.find(d => d.id === id) || null;
  }

  // ============================================================================
  // SERVICE ENTITY METHODS
  // ============================================================================

  /**
   * Create a service entity
   */
  async createService(input: CreateServiceInput): Promise<ServiceEntity> {
    const now = new Date().toISOString();

    const service: ServiceEntity = {
      id: input.id,
      name: input.name,
      entityType: 'service',
      serviceType: input.serviceType,
      ownerId: input.ownerId,
      endpoints: input.endpoints,
      monitoring: input.monitoring,
      deployment: input.deployment,
      dependencies: input.dependencies,
      status: 'active',
      description: input.description,
      tags: input.tags || [],
      attributes: input.attributes || [],
      onboarded_at: now,
      createdAt: now,
      updatedAt: now
    };

    const existingServices = await this.readEntitiesFromPartition<ServiceEntity>('service');
    existingServices.push(service);
    await this.writeEntitiesToPartition('service', existingServices);

    return service;
  }

  /**
   * Get all services
   */
  async getServices(): Promise<ServiceEntity[]> {
    return this.readEntitiesFromPartition<ServiceEntity>('service');
  }

  /**
   * Get a service by ID
   */
  async getService(id: string): Promise<ServiceEntity | null> {
    const services = await this.getServices();
    return services.find(s => s.id === id) || null;
  }

  // ============================================================================
  // ACTIVITY TRACKING
  // ============================================================================

  /**
   * Add activity to an entity
   */
  async addActivity(
    entityType: EntityType,
    entityId: string,
    activity: Omit<Activity, 'timestamp'>
  ): Promise<void> {
    const entities = await this.readEntitiesFromPartition<Entity>(entityType);
    const entity = entities.find(e => e.id === entityId);

    if (!entity) {
      throw new Error(`Entity ${entityId} not found in ${entityType}`);
    }

    const activityRecord: Activity = {
      ...activity,
      timestamp: new Date().toISOString()
    };

    if (!entity.activities) {
      entity.activities = [];
    }
    entity.activities.push(activityRecord);
    entity.updatedAt = new Date().toISOString();
    entity.last_active = activityRecord.timestamp;

    await this.writeEntitiesToPartition(entityType, entities);
  }

  // ============================================================================
  // DISCOVERY AND MANIFEST
  // ============================================================================

  /**
   * Discover all entities and generate references
   */
  async discoverEntities(): Promise<EntityManifest> {
    const persons = await this.getPersons();
    const agents = await this.getAgents();
    const devices = await this.getDevices();
    const services = await this.getServices();

    const personReferences: EntityReference[] = persons.map(p => ({
      id: p.id,
      name: p.name,
      entityType: 'person',
      status: p.status,
      path: `entity=person/${this.getDataFileName(this.getPartitionPath('person'))}`
    }));

    const agentReferences: EntityReference[] = agents.map(a => ({
      id: a.id,
      name: a.name,
      entityType: 'agent',
      status: a.status,
      path: `entity=agent/${this.getDataFileName(this.getPartitionPath('agent'))}`
    }));

    const deviceReferences: EntityReference[] = devices.map(d => ({
      id: d.id,
      name: d.name,
      entityType: 'device',
      status: d.status,
      path: `entity=device/${this.getDataFileName(this.getPartitionPath('device'))}`
    }));

    const serviceReferences: EntityReference[] = services.map(s => ({
      id: s.id,
      name: s.name,
      entityType: 'service',
      status: s.status,
      path: `entity=service/${this.getDataFileName(this.getPartitionPath('service'))}`
    }));

    const manifest: EntityManifest = {
      teamId: this.config.teamId,
      administrativeUnit: this.config.administrativeUnit,
      businessUnit: this.config.businessUnit,
      organization: this.config.organization,
      team: this.config.team,
      stats: {
        totalPersons: persons.length,
        totalAgents: agents.length,
        totalDevices: devices.length,
        totalServices: services.length
      },
      discoveredEntities: {
        persons: personReferences,
        agents: agentReferences,
        devices: deviceReferences,
        services: serviceReferences
      },
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return manifest;
  }

  /**
   * Save the entity manifest
   */
  async saveManifest(manifest: EntityManifest): Promise<void> {
    const manifestPath = join(
      this.config.basePath,
      `administrative_unit=${this.config.administrativeUnit}`,
      `business_unit=${this.config.businessUnit}`,
      `organization=${this.config.organization}`,
      `team=${this.config.team}`,
      'entity.manifest.json'
    );

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /**
   * Load the entity manifest
   */
  async loadManifest(): Promise<EntityManifest | null> {
    const manifestPath = join(
      this.config.basePath,
      `administrative_unit=${this.config.administrativeUnit}`,
      `business_unit=${this.config.businessUnit}`,
      `organization=${this.config.organization}`,
      `team=${this.config.team}`,
      'entity.manifest.json'
    );

    try {
      const content = await readFile(manifestPath, 'utf-8');
      return JSON.parse(content) as EntityManifest;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }
}
