/**
 * Local Framework Adapter (New Implementation)
 *
 * Implements IFrameworkAdapter using @digital-minion/data for storage.
 * Stores ALL framework data in partitioned JSONL files in .minion/local.
 *
 * Storage Structure:
 * .minion/local/
 *   administrative_unit={au}/
 *     business_unit={bu}/
 *       organization={org}/
 *         team={team}/
 *           framework.manifest.json
 *           framework={framework-id}/
 *             category=_/
 *               artifact=metadata/
 *                 data-{hash}.jsonl        # Framework definition
 *               artifact=assessment/
 *                 data-{hash}.jsonl        # Assessments
 *               artifact=mapping/
 *                 data-{hash}.jsonl        # Mappings
 *               artifact=documentation/
 *                 data-{hash}.jsonl        # Framework-wide documentation
 *             category=identify/
 *               artifact=control/
 *                 data-{hash}.jsonl        # Identify controls
 *               artifact=evidence/
 *                 data-{hash}.jsonl        # Evidence for Identify controls
 *             category=protect/
 *               artifact=control/
 *                 data-{hash}.jsonl        # Protect controls
 *               artifact=evidence/
 *                 data-{hash}.jsonl        # Evidence for Protect controls
 *               artifact=gap/
 *                 data-{hash}.jsonl        # Gaps for Protect controls
 */

import { DataLayer, NamespaceMetadataManager } from '@digital-minion/data';
import {
  IFrameworkAdapter,
  BackendAdapterConfig,
  BackendFeature,
  SyncResult,
} from '../schema/minion/framework';
import {
  ControlFramework,
  Control,
  ControlAssessment,
  ControlGap,
  ControlMapping,
  Evidence,
  Documentation,
  CreateFrameworkInput,
  CreateControlInput,
  CreateAssessmentInput,
  AddControlGapInput,
  FrameworkFilter,
  ImplementationStatus,
  MaturityLevel,
  DocumentationStatus,
} from '../schema/minion/function/framework';

/**
 * Configuration for Local Framework Adapter.
 */
export interface LocalFrameworkAdapterConfig extends BackendAdapterConfig {
  /** Base path for .minion/local data storage */
  localBasePath?: string;
}

/**
 * Local Framework Adapter stores framework data locally using @digital-minion/data.
 */
export class LocalFrameworkAdapter implements IFrameworkAdapter {
  readonly backend: any;
  readonly context: any;

  private localBasePath: string;
  private dataLayer: DataLayer;
  private metadataManager: NamespaceMetadataManager;
  private initialized = false;

  constructor(private config: LocalFrameworkAdapterConfig) {
    this.backend = config.backend;
    this.context = config.context;
    this.localBasePath = config.localBasePath || './.minion/local';
    this.metadataManager = new NamespaceMetadataManager();
    this.dataLayer = new DataLayer({
      basePath: this.localBasePath,
      collection: 'framework',
      adapterType: 'jsonl',
    });
  }

  /**
   * Check if backend supports a specific feature.
   */
  supportsFeature(feature: BackendFeature): boolean {
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

    // Initialize namespace with partition schema
    await this.initializeNamespace();

    // Initialize data layer
    await this.dataLayer.initialize();

    this.initialized = true;
  }

  /**
   * Initialize the framework namespace.
   */
  private async initializeNamespace(): Promise<void> {
    try {
      // Try to load existing namespace
      await this.metadataManager.loadMetadata(this.localBasePath, 'framework');
    } catch {
      // Create namespace if it doesn't exist
      await this.metadataManager.createNamespace({
        namespace: 'framework',
        basePath: this.localBasePath,
        partitionSchema: {
          order: [
            'administrative_unit',
            'business_unit',
            'organization',
            'team',
            'framework',
            'category',
            'artifact',
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
              regex: '^[a-z0-9-]+$',
              required: true,
              description: 'Organization identifier',
            },
            team: {
              type: 'string',
              regex: '^[a-z0-9-]+$',
              required: true,
              description: 'Team identifier',
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
              description: 'Framework category (identify, protect, detect, etc.) or _ for framework-wide',
            },
            artifact: {
              type: 'string',
              regex: '^(metadata|control|assessment|mapping|gap|evidence|documentation)$',
              required: true,
              description: 'Type of framework artifact',
            },
          },
        },
        dataFormat: 'jsonl',
      });
    }
  }

  /**
   * Get backend-specific metadata tags.
   */
  getMetadataTags(): string[] {
    return ['framework', 'control', 'compliance'];
  }

  // ========================================
  // Framework Operations
  // ========================================

  /**
   * Create a new framework.
   */
  async createFramework(input: CreateFrameworkInput): Promise<ControlFramework> {
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

    await this.dataLayer.write({
      data: [framework],
      partitionPath: this.getPartitionPath(input.id, '_', 'metadata'),
    });

    return framework;
  }

  /**
   * Get a framework by ID.
   */
  async getFramework(frameworkId: string): Promise<ControlFramework> {
    const result = await this.dataLayer.query({
      partitionFilter: this.getPartitionPath(frameworkId, '_', 'metadata'),
    });

    if (!result.data || result.data.length === 0) {
      throw new Error(`Framework ${frameworkId} not found`);
    }

    return result.data[0] as ControlFramework;
  }

  /**
   * List all frameworks.
   */
  async listFrameworks(): Promise<ControlFramework[]> {
    const result = await this.dataLayer.query({
      partitionFilter: {
        ...this.getBasePartitionPath(),
        category: '_',
        artifact: 'metadata',
      },
    });

    return (result.data || []) as ControlFramework[];
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

    await this.dataLayer.write({
      data: [updated],
      partitionPath: this.getPartitionPath(frameworkId, '_', 'metadata'),
    });

    return updated;
  }

  /**
   * Delete a framework.
   */
  async deleteFramework(frameworkId: string): Promise<void> {
    // TODO: Implement framework deletion
    // Need to delete metadata, all controls, assessments, mappings, gaps
    throw new Error('deleteFramework not yet implemented');
  }

  // ========================================
  // Control Operations
  // ========================================

  /**
   * Create a new control.
   */
  async createControl(input: CreateControlInput): Promise<Control> {
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

    await this.dataLayer.write({
      data: [control],
      partitionPath: this.getPartitionPath(
        input.frameworkId,
        input.category || '_',
        'control'
      ),
    });

    // Update framework total controls count
    const framework = await this.getFramework(input.frameworkId);
    await this.updateFramework(input.frameworkId, {
      totalControls: framework.totalControls + 1,
    });

    return control;
  }

  /**
   * Get a control by ID.
   */
  async getControl(controlId: string): Promise<Control> {
    // Extract framework ID from control ID (format: frameworkId-controlId)
    const frameworkId = controlId.split('-')[0];

    // Query all control partitions for this framework (across all categories)
    const result = await this.dataLayer.query({
      partitionFilter: {
        ...this.getBasePartitionPath(),
        framework: frameworkId,
        artifact: 'control',
      },
    });

    const control = (result.data || []).find(
      (c: Control) => c.id === controlId || c.controlId === controlId
    );

    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    return control as Control;
  }

  /**
   * List controls for a framework.
   */
  async listControls(frameworkId: string, filter?: FrameworkFilter): Promise<Control[]> {
    const partitionFilter: any = {
      ...this.getBasePartitionPath(),
      framework: frameworkId,
      artifact: 'control',
    };

    if (filter?.category && filter.category.length > 0) {
      partitionFilter.category = filter.category[0]; // Simple implementation for single category
    }

    const result = await this.dataLayer.query({
      partitionFilter,
    });

    let controls = (result.data || []) as Control[];

    // Apply additional filters
    if (filter) {
      if (filter.implementationStatus && filter.implementationStatus.length > 0) {
        controls = controls.filter((c) =>
          filter.implementationStatus!.includes(c.implementationStatus)
        );
      }

      if (filter.maturityLevel && filter.maturityLevel.length > 0) {
        controls = controls.filter((c) =>
          filter.maturityLevel!.includes(c.maturityLevel)
        );
      }

      if (filter.priority && filter.priority.length > 0) {
        controls = controls.filter((c) => c.priority && filter.priority!.includes(c.priority));
      }

      if (filter.assignee) {
        controls = controls.filter((c) => c.assignedTo.assignee === filter.assignee);
      }

      if (filter.needsAssessment) {
        const now = new Date();
        controls = controls.filter((c) => {
          if (!c.nextAssessment) return true;
          return new Date(c.nextAssessment) <= now;
        });
      }

      // Apply sorting
      if (filter.sortBy) {
        controls = this.sortControls(controls, filter.sortBy, filter.sortDirection);
      }
    }

    return controls;
  }

  /**
   * Update a control.
   */
  async updateControl(controlId: string, updates: Partial<Control>): Promise<Control> {
    const control = await this.getControl(controlId);

    const updated: Control = {
      ...control,
      ...updates,
      metadata: {
        ...control.metadata,
        updatedAt: new Date().toISOString(),
        version: (control.metadata.version || 1) + 1,
      },
    };

    await this.dataLayer.write({
      data: [updated],
      partitionPath: this.getPartitionPath(
        control.frameworkId,
        control.category || '_',
        'control'
      ),
    });

    return updated;
  }

  /**
   * Delete a control.
   */
  async deleteControl(controlId: string): Promise<void> {
    // TODO: Implement control deletion
    throw new Error('deleteControl not yet implemented');
  }

  // ========================================
  // Assessment Operations
  // ========================================

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

    await this.dataLayer.write({
      data: [assessment],
      partitionPath: this.getPartitionPath(
        input.frameworkId,
        '_',
        'assessment'
      ),
    });

    return assessment;
  }

  /**
   * Get an assessment by ID.
   */
  async getAssessment(assessmentId: string): Promise<ControlAssessment> {
    // Extract framework ID from assessment ID
    const frameworkId = assessmentId.split('-')[0];

    const result = await this.dataLayer.query({
      partitionFilter: this.getPartitionPath(frameworkId, '_', 'assessment'),
    });

    if (!result.data || result.data.length === 0) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    return result.data[0] as ControlAssessment;
  }

  /**
   * List assessments.
   */
  async listAssessments(frameworkId?: string): Promise<ControlAssessment[]> {
    const partitionFilter: any = {
      ...this.getBasePartitionPath(),
      category: '_',
      artifact: 'assessment',
    };

    if (frameworkId) {
      partitionFilter.framework = frameworkId;
    }

    const result = await this.dataLayer.query({
      partitionFilter,
    });

    return (result.data || []) as ControlAssessment[];
  }

  /**
   * Update an assessment.
   */
  async updateAssessment(
    assessmentId: string,
    updates: Partial<ControlAssessment>
  ): Promise<ControlAssessment> {
    const assessment = await this.getAssessment(assessmentId);

    const updated: ControlAssessment = {
      ...assessment,
      ...updates,
      metadata: {
        ...assessment.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    await this.dataLayer.write({
      data: [updated],
      partitionPath: this.getPartitionPath(
        assessment.frameworkId,
        '_',
        'assessment'
      ),
    });

    return updated;
  }

  /**
   * Delete an assessment.
   */
  async deleteAssessment(assessmentId: string): Promise<void> {
    // TODO: Implement assessment deletion
    throw new Error('deleteAssessment not yet implemented');
  }

  // ========================================
  // Gap Operations
  // ========================================

  /**
   * Add a control gap.
   */
  async addGap(input: AddControlGapInput): Promise<ControlGap> {
    const control = await this.getControl(input.controlId);

    const gap: ControlGap = {
      controlId: input.controlId,
      controlName: control.name,
      issue: input.issue,
      impact: input.impact,
      remediation: input.remediation,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      status: 'open',
    };

    await this.dataLayer.write({
      data: [gap],
      partitionPath: this.getPartitionPath(control.frameworkId, control.category || '_', 'gap'),
    });

    return gap;
  }

  /**
   * Update a gap.
   */
  async updateGap(gapId: string, updates: Partial<ControlGap>): Promise<ControlGap> {
    // TODO: Implement gap update with proper querying
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
    const partitionFilter: any = {
      ...this.getBasePartitionPath(),
      artifact: 'gap',
    };

    if (frameworkId) {
      partitionFilter.framework = frameworkId;
    }

    const result = await this.dataLayer.query({
      partitionFilter,
    });

    return (result.data || []) as ControlGap[];
  }

  // ========================================
  // Mapping Operations
  // ========================================

  /**
   * Add a mapping.
   */
  async addMapping(mapping: ControlMapping): Promise<void> {
    await this.dataLayer.write({
      data: [mapping],
      partitionPath: this.getPartitionPath(
        mapping.frameworkId,
        '_',
        'mapping'
      ),
    });
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
    const partitionFilter: any = this.getPartitionPath(frameworkId, '_', 'mapping');

    const result = await this.dataLayer.query({
      partitionFilter,
    });

    let mappings = (result.data || []) as ControlMapping[];

    if (controlId) {
      mappings = mappings.filter((m) => m.controlId === controlId);
    }

    return mappings;
  }

  // ========================================
  // Sync Operations
  // ========================================

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

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Get base partition path from context.
   */
  private getBasePartitionPath(): any {
    return {
      administrative_unit: this.context.path.administrativeUnit,
      business_unit: this.context.path.businessUnit,
      organization: this.context.path.organization,
      team: this.context.path.team,
    };
  }

  /**
   * Get partition path for framework data.
   *
   * Order: framework → category → artifact
   *
   * @param frameworkId Framework identifier (e.g., 'nist-csf')
   * @param category Framework category (e.g., 'identify') or '_' for framework-wide
   * @param artifact Artifact type (metadata, control, assessment, mapping, gap)
   */
  private getPartitionPath(
    frameworkId: string,
    category: string,
    artifact: string
  ): any {
    return {
      ...this.getBasePartitionPath(),
      framework: frameworkId,
      category: category,
      artifact: artifact,
    };
  }

  /**
   * Sort controls by field.
   */
  private sortControls(
    controls: Control[],
    sortBy: string,
    direction: 'asc' | 'desc' = 'asc'
  ): Control[] {
    const sorted = [...controls].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'controlId':
          aVal = a.controlId;
          bVal = b.controlId;
          break;
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'status':
          aVal = a.implementationStatus;
          bVal = b.implementationStatus;
          break;
        case 'maturity':
          aVal = parseInt(a.maturityLevel);
          bVal = parseInt(b.maturityLevel);
          break;
        case 'lastAssessed':
          aVal = a.lastAssessed || '';
          bVal = b.lastAssessed || '';
          break;
        case 'priority':
          aVal = a.priority || '';
          bVal = b.priority || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }
}
