/**
 * Local Framework Adapter
 *
 * Implements IFrameworkAdapter using @digital-minion/data for storage.
 * Stores framework control data in partitioned JSONL files.
 */

import { DataLayer, NamespaceMetadataManager } from '@digital-minion/data';
import { IFrameworkAdapter, BackendAdapterConfig, BackendFeature, SyncResult } from '../schema/minion/framework';
import {
  ControlFramework,
  Control,
  ControlAssessment,
  ControlGap,
  ControlMapping,
  CreateFrameworkInput,
  CreateControlInput,
  CreateAssessmentInput,
  AddControlGapInput,
  FrameworkFilter,
  ImplementationStatus,
  MaturityLevel,
} from '../schema/minion/function/framework';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

/**
 * Configuration for Local Framework Adapter.
 */
export interface LocalFrameworkAdapterConfig extends BackendAdapterConfig {
  /** Base path for framework data */
  frameworkBasePath?: string;

  /** Base path for .minion/local data storage */
  localBasePath?: string;
}

/**
 * Local Framework Adapter stores framework data locally using @digital-minion/data.
 */
export class LocalFrameworkAdapter implements IFrameworkAdapter {
  readonly backend: any;
  readonly context: any;

  private frameworkBasePath: string;
  private localBasePath: string;
  private controlDataLayer?: DataLayer;
  private metadataManager: NamespaceMetadataManager;
  private initialized = false;

  constructor(private config: LocalFrameworkAdapterConfig) {
    this.backend = config.backend;
    this.context = config.context;
    this.frameworkBasePath = config.frameworkBasePath || './packages/program/src/framework';
    this.localBasePath = config.localBasePath || './.minion/local';
    this.metadataManager = new NamespaceMetadataManager();
  }

  /**
   * Check if backend supports a specific feature.
   */
  supportsFeature(feature: BackendFeature): boolean {
    // Local adapter supports most features through the data layer
    const supported = [
      BackendFeature.TAGS,
      BackendFeature.COMMENTS,
      BackendFeature.ATTACHMENTS,
      BackendFeature.SEARCH,
    ];
    return supported.includes(feature);
  }

  /**
   * Initialize the adapter.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Ensure base paths exist
    if (!existsSync(this.frameworkBasePath)) {
      mkdirSync(this.frameworkBasePath, { recursive: true });
    }
    if (!existsSync(this.localBasePath)) {
      mkdirSync(this.localBasePath, { recursive: true });
    }

    // Initialize control data layer with partition schema
    await this.initializeControlDataLayer();

    this.initialized = true;
  }

  /**
   * Initialize the control data layer with partition schema.
   */
  private async initializeControlDataLayer(): Promise<void> {
    const namespacePath = join(this.localBasePath, 'framework-controls');

    // Check if namespace exists, create if not
    try {
      await this.metadataManager.loadMetadata(this.localBasePath, 'framework-controls');
    } catch {
      // Create namespace with partition schema
      await this.metadataManager.createNamespace({
        namespace: 'framework-controls',
        basePath: this.localBasePath,
        partitionSchema: {
          order: [
            'administrative_unit',
            'business_unit',
            'organization',
            'team',
            'framework',
            'category',
            'implementation_status',
            'maturity_level',
          ],
          partitions: {
            administrative_unit: {
              type: 'string',
              regex: '^[a-z0-9-]+$',
              required: true,
              description: 'Administrative unit identifier',
            },
            business_unit: {
              type: 'string',
              regex: '^[a-z0-9-]+$',
              required: true,
              description: 'Business unit identifier',
            },
            organization: {
              type: 'string',
              regex: '^([a-z0-9-]+|_)$',
              required: true,
              description: 'Organization identifier or _ for entity-wide',
            },
            team: {
              type: 'string',
              regex: '^([a-z0-9-]+|_)$',
              required: true,
              description: 'Team identifier or _ for organization-wide',
            },
            framework: {
              type: 'string',
              regex: '^[a-z0-9-]+$',
              required: true,
              description: 'Framework identifier (e.g., nist-csf, iso-27001)',
            },
            category: {
              type: 'string',
              regex: '^([a-z0-9-]+|_)$',
              required: true,
              description: 'Control category/function or _ for uncategorized',
            },
            implementation_status: {
              type: 'string',
              regex: '^(implemented|partial|not-implemented|not-applicable)$',
              required: true,
              description: 'Control implementation status',
            },
            maturity_level: {
              type: 'string',
              regex: '^[0-3]$',
              required: true,
              description: 'Maturity level (0-3)',
            },
          },
        },
        dataFormat: 'jsonl',
      });
    }

    // Initialize data layer
    this.controlDataLayer = new DataLayer({
      basePath: this.localBasePath,
      collection: 'framework-controls',
      adapterType: 'jsonl',
    });

    await this.controlDataLayer.initialize();
  }

  /**
   * Get backend-specific metadata tags.
   */
  getMetadataTags(): string[] {
    return ['framework', 'control', 'compliance'];
  }

  // Framework operations

  /**
   * Create a new framework.
   */
  async createFramework(input: CreateFrameworkInput): Promise<ControlFramework> {
    const frameworkPath = join(this.frameworkBasePath, input.id);

    if (!existsSync(frameworkPath)) {
      mkdirSync(frameworkPath, { recursive: true });
      mkdirSync(join(frameworkPath, 'controls'), { recursive: true });
      mkdirSync(join(frameworkPath, 'mappings'), { recursive: true });
      mkdirSync(join(frameworkPath, 'assessments'), { recursive: true });
    }

    const framework: ControlFramework = {
      id: input.id,
      name: input.name,
      version: input.version,
      adoptedDate: input.adoptedDate,
      description: input.description,
      organization: input.organization,
      team: input.team,
      categories: input.categories.map((cat, idx) => ({ ...cat, order: idx })),
      maturityLevels: input.maturityLevels || [
        { level: 0, name: 'Partial', description: 'Organizational practices are not formalized' },
        { level: 1, name: 'Risk Informed', description: 'Practices approved by management but not policy' },
        { level: 2, name: 'Repeatable', description: 'Practices formally approved and expressed as policy' },
        { level: 3, name: 'Adaptive', description: 'Organization adapts practices based on lessons learned' },
      ],
      scope: input.scope,
      status: 'active',
      totalControls: 0,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const frameworkFile = join(frameworkPath, 'framework.json');
    writeFileSync(frameworkFile, JSON.stringify(framework, null, 2));

    return framework;
  }

  /**
   * Get a framework by ID.
   */
  async getFramework(frameworkId: string): Promise<ControlFramework> {
    const frameworkFile = join(this.frameworkBasePath, frameworkId, 'framework.json');

    if (!existsSync(frameworkFile)) {
      throw new Error(`Framework ${frameworkId} not found`);
    }

    const data = readFileSync(frameworkFile, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * List all frameworks.
   */
  async listFrameworks(): Promise<ControlFramework[]> {
    const frameworks: ControlFramework[] = [];

    // TODO: Scan framework directory for all framework.json files
    // For now, return empty array

    return frameworks;
  }

  /**
   * Update a framework.
   */
  async updateFramework(
    frameworkId: string,
    updates: Partial<ControlFramework>
  ): Promise<ControlFramework> {
    const framework = await this.getFramework(frameworkId);

    const updated: ControlFramework = {
      ...framework,
      ...updates,
      metadata: {
        ...framework.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    const frameworkFile = join(this.frameworkBasePath, frameworkId, 'framework.json');
    writeFileSync(frameworkFile, JSON.stringify(updated, null, 2));

    return updated;
  }

  /**
   * Delete a framework.
   */
  async deleteFramework(frameworkId: string): Promise<void> {
    // TODO: Implement framework deletion
    throw new Error('deleteFramework not yet implemented');
  }

  // Control operations

  /**
   * Create a new control.
   */
  async createControl(input: CreateControlInput): Promise<Control> {
    if (!this.controlDataLayer) {
      throw new Error('Control data layer not initialized');
    }

    const control: Control = {
      id: `${input.frameworkId}-${input.controlId}`,
      controlId: input.controlId,
      frameworkId: input.frameworkId,
      frameworkName: input.frameworkId, // TODO: Get actual framework name
      category: input.category,
      subcategory: input.subcategory,
      name: input.name,
      description: input.description,
      guidance: input.guidance,
      implementationStatus: input.implementationStatus,
      maturityLevel: input.maturityLevel,
      priority: input.priority,
      assignedTo: input.assignedTo,
      mappedPolicies: input.mappedPolicies || [],
      mappedRoles: input.mappedRoles || [],
      mappedMethods: input.mappedMethods || [],
      references: input.references || [],
      evidenceLocations: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      },
    };

    // Store control in partitioned data layer
    await this.controlDataLayer.query({
      partitionFilter: {
        administrative_unit: this.context.path.administrativeUnit,
        business_unit: this.context.path.businessUnit,
        organization: input.assignedTo.organization,
        team: input.assignedTo.team,
        framework: input.frameworkId,
        category: input.category || '_',
        implementation_status: input.implementationStatus,
        maturity_level: input.maturityLevel,
      },
    });

    // TODO: Actually write the control data using DataLayer
    // For now, just return the control object

    return control;
  }

  /**
   * Get a control by ID.
   */
  async getControl(controlId: string): Promise<Control> {
    if (!this.controlDataLayer) {
      throw new Error('Control data layer not initialized');
    }

    // TODO: Query control from data layer
    throw new Error('getControl not yet implemented');
  }

  /**
   * List controls for a framework.
   */
  async listControls(frameworkId: string, filter?: FrameworkFilter): Promise<Control[]> {
    if (!this.controlDataLayer) {
      throw new Error('Control data layer not initialized');
    }

    const partitionFilter: any = {
      framework: frameworkId,
    };

    if (filter?.implementationStatus) {
      partitionFilter.implementation_status = filter.implementationStatus;
    }

    if (filter?.maturityLevel) {
      partitionFilter.maturity_level = filter.maturityLevel;
    }

    if (filter?.category) {
      partitionFilter.category = filter.category;
    }

    if (filter?.organization) {
      partitionFilter.organization = filter.organization;
    }

    if (filter?.team) {
      partitionFilter.team = filter.team;
    }

    const result = await this.controlDataLayer.query({
      partitionFilter,
    });

    return result.data;
  }

  /**
   * Update a control.
   */
  async updateControl(controlId: string, updates: Partial<Control>): Promise<Control> {
    // TODO: Implement control update
    throw new Error('updateControl not yet implemented');
  }

  /**
   * Delete a control.
   */
  async deleteControl(controlId: string): Promise<void> {
    // TODO: Implement control deletion
    throw new Error('deleteControl not yet implemented');
  }

  // Assessment operations

  /**
   * Create an assessment.
   */
  async createAssessment(input: CreateAssessmentInput): Promise<ControlAssessment> {
    const assessment: ControlAssessment = {
      id: `${input.frameworkId}-${Date.now()}`,
      name: input.name,
      frameworkId: input.frameworkId,
      frameworkName: input.frameworkId, // TODO: Get actual framework name
      assessmentDate: input.assessmentDate,
      assessor: input.assessor,
      status: 'planned',
      scope: input.scope,
      results: {
        totalControls: 0,
        assessed: 0,
        implemented: 0,
        partiallyImplemented: 0,
        notImplemented: 0,
        notApplicable: 0,
        compliancePercentage: 0,
      },
      maturityScore: {
        overall: 0,
        byCategory: {},
      },
      gaps: [],
      findings: [],
      recommendations: [],
      methodology: input.methodology,
      period: input.period,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const assessmentFile = join(
      this.frameworkBasePath,
      input.frameworkId,
      'assessments',
      `${assessment.id}.json`
    );

    writeFileSync(assessmentFile, JSON.stringify(assessment, null, 2));

    return assessment;
  }

  /**
   * Get an assessment by ID.
   */
  async getAssessment(assessmentId: string): Promise<ControlAssessment> {
    // TODO: Implement assessment retrieval
    throw new Error('getAssessment not yet implemented');
  }

  /**
   * List assessments.
   */
  async listAssessments(frameworkId?: string): Promise<ControlAssessment[]> {
    // TODO: Implement assessment listing
    return [];
  }

  /**
   * Update an assessment.
   */
  async updateAssessment(
    assessmentId: string,
    updates: Partial<ControlAssessment>
  ): Promise<ControlAssessment> {
    // TODO: Implement assessment update
    throw new Error('updateAssessment not yet implemented');
  }

  /**
   * Delete an assessment.
   */
  async deleteAssessment(assessmentId: string): Promise<void> {
    // TODO: Implement assessment deletion
    throw new Error('deleteAssessment not yet implemented');
  }

  // Gap operations

  /**
   * Add a control gap.
   */
  async addGap(input: AddControlGapInput): Promise<ControlGap> {
    const gap: ControlGap = {
      controlId: input.controlId,
      controlName: input.controlId, // TODO: Get actual control name
      issue: input.issue,
      impact: input.impact,
      remediation: input.remediation,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      status: 'open',
    };

    // TODO: Store gap persistently

    return gap;
  }

  /**
   * Update a gap.
   */
  async updateGap(gapId: string, updates: Partial<ControlGap>): Promise<ControlGap> {
    // TODO: Implement gap update
    throw new Error('updateGap not yet implemented');
  }

  /**
   * Delete a gap.
   */
  async deleteGap(gapId: string): Promise<void> {
    // TODO: Implement gap deletion
    throw new Error('deleteGap not yet implemented');
  }

  /**
   * List gaps.
   */
  async listGaps(frameworkId?: string, assessmentId?: string): Promise<ControlGap[]> {
    // TODO: Implement gap listing
    return [];
  }

  // Mapping operations

  /**
   * Add a mapping.
   */
  async addMapping(mapping: ControlMapping): Promise<void> {
    const mappingFile = join(
      this.frameworkBasePath,
      mapping.frameworkId,
      'mappings',
      `${mapping.type}s.json`
    );

    let mappings: ControlMapping[] = [];
    if (existsSync(mappingFile)) {
      const data = readFileSync(mappingFile, 'utf-8');
      mappings = JSON.parse(data);
    }

    mappings.push(mapping);
    writeFileSync(mappingFile, JSON.stringify(mappings, null, 2));
  }

  /**
   * Remove a mapping.
   */
  async removeMapping(
    frameworkId: string,
    controlId: string,
    type: string,
    targetId: string
  ): Promise<void> {
    // TODO: Implement mapping removal
    throw new Error('removeMapping not yet implemented');
  }

  /**
   * Get mappings.
   */
  async getMappings(frameworkId: string, controlId?: string): Promise<ControlMapping[]> {
    const mappingsDir = join(this.frameworkBasePath, frameworkId, 'mappings');
    const mappings: ControlMapping[] = [];

    if (!existsSync(mappingsDir)) {
      return mappings;
    }

    // TODO: Read all mapping files and filter by controlId if provided

    return mappings;
  }

  /**
   * Sync to backend (not applicable for local adapter).
   */
  async syncToBackend(): Promise<SyncResult> {
    return {
      success: true,
      itemsSynced: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      conflicts: 0,
      errors: [],
      durationMs: 0,
    };
  }

  /**
   * Sync from backend (not applicable for local adapter).
   */
  async syncFromBackend(): Promise<SyncResult> {
    return {
      success: true,
      itemsSynced: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      conflicts: 0,
      errors: [],
      durationMs: 0,
    };
  }
}
