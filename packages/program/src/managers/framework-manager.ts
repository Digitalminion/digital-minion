/**
 * Framework Manager
 *
 * Manages control frameworks, controls, assessments, and compliance tracking.
 */

import { ProgramContext } from '../core/types';
import {
  IFrameworkManager,
  IFrameworkAdapter,
} from '../schema/minion/framework';
import {
  ControlFramework,
  Control,
  ControlAssessment,
  ControlGap,
  ControlMapping,
  CreateFrameworkInput,
  CreateControlInput,
  CreateAssessmentInput,
  UpdateControlImplementationInput,
  AddEvidenceInput,
  AddControlGapInput,
  FrameworkStatistics,
  FrameworkDashboard,
  ComplianceTrendData,
  MaturityTrendData,
  FrameworkFilter,
  FrameworkActivity,
  ImplementationStatus,
  MaturityLevel,
} from '../schema/minion/function/framework';

/**
 * Configuration for Framework Manager.
 */
export interface FrameworkManagerConfig {
  /** Adapter instance */
  adapter: IFrameworkAdapter;

  /** Program context */
  context: ProgramContext;
}

/**
 * Framework Manager provides high-level operations for framework management.
 */
export class FrameworkManager implements IFrameworkManager {
  readonly adapter: IFrameworkAdapter;
  readonly context: ProgramContext;

  constructor(config: FrameworkManagerConfig) {
    this.adapter = config.adapter;
    this.context = config.context;
  }

  /**
   * Initialize the manager.
   */
  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  // Framework operations

  /**
   * Create a new control framework.
   */
  async createFramework(input: CreateFrameworkInput): Promise<ControlFramework> {
    return this.adapter.createFramework(input);
  }

  /**
   * Get a framework by ID.
   */
  async getFramework(frameworkId: string): Promise<ControlFramework> {
    return this.adapter.getFramework(frameworkId);
  }

  /**
   * List all frameworks.
   */
  async listFrameworks(): Promise<ControlFramework[]> {
    return this.adapter.listFrameworks();
  }

  /**
   * Update a framework.
   */
  async updateFramework(
    frameworkId: string,
    updates: Partial<ControlFramework>
  ): Promise<ControlFramework> {
    return this.adapter.updateFramework(frameworkId, updates);
  }

  // Control operations

  /**
   * Create a new control.
   */
  async createControl(input: CreateControlInput): Promise<Control> {
    return this.adapter.createControl(input);
  }

  /**
   * Get a control by ID.
   */
  async getControl(controlId: string): Promise<Control> {
    return this.adapter.getControl(controlId);
  }

  /**
   * List controls for a framework.
   */
  async listControls(
    frameworkId: string,
    filter?: FrameworkFilter
  ): Promise<Control[]> {
    return this.adapter.listControls(frameworkId, filter);
  }

  /**
   * Update control implementation status.
   */
  async updateControlImplementation(
    input: UpdateControlImplementationInput
  ): Promise<Control> {
    const control = await this.adapter.getControl(input.controlId);

    return this.adapter.updateControl(input.controlId, {
      implementationStatus: input.implementationStatus,
      maturityLevel: input.maturityLevel,
      notes: input.notes,
      evidenceLocations: input.evidenceLocations || control.evidenceLocations,
      metadata: {
        ...control.metadata,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Add evidence to a control.
   */
  async addEvidence(input: AddEvidenceInput): Promise<void> {
    const control = await this.adapter.getControl(input.controlId);

    const updatedEvidenceLocations = [
      ...control.evidenceLocations,
      input.evidence,
    ];

    await this.adapter.updateControl(input.controlId, {
      evidenceLocations: updatedEvidenceLocations,
      metadata: {
        ...control.metadata,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  // Assessment operations

  /**
   * Create a new assessment.
   */
  async createAssessment(input: CreateAssessmentInput): Promise<ControlAssessment> {
    return this.adapter.createAssessment(input);
  }

  /**
   * Get an assessment by ID.
   */
  async getAssessment(assessmentId: string): Promise<ControlAssessment> {
    return this.adapter.getAssessment(assessmentId);
  }

  /**
   * List assessments.
   */
  async listAssessments(frameworkId?: string): Promise<ControlAssessment[]> {
    return this.adapter.listAssessments(frameworkId);
  }

  /**
   * Complete an assessment.
   */
  async completeAssessment(assessmentId: string): Promise<void> {
    const assessment = await this.adapter.getAssessment(assessmentId);

    await this.adapter.updateAssessment(assessmentId, {
      status: 'completed' as any,
      metadata: {
        ...assessment.metadata,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Approve an assessment.
   */
  async approveAssessment(
    assessmentId: string,
    approver: string,
    notes?: string
  ): Promise<void> {
    const assessment = await this.adapter.getAssessment(assessmentId);

    await this.adapter.updateAssessment(assessmentId, {
      status: 'approved' as any,
      signOff: {
        approver,
        approvedDate: new Date().toISOString(),
        notes,
      },
      metadata: {
        ...assessment.metadata,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  // Gap management

  /**
   * Add a control gap.
   */
  async addGap(input: AddControlGapInput): Promise<ControlGap> {
    return this.adapter.addGap(input);
  }

  /**
   * Resolve a control gap.
   */
  async resolveGap(gapId: string, notes?: string): Promise<void> {
    const gap = await this.adapter.listGaps().then((gaps) =>
      gaps.find((g) => g.controlId === gapId)
    );

    if (!gap) {
      throw new Error(`Gap ${gapId} not found`);
    }

    await this.adapter.updateGap(gapId, {
      status: 'resolved',
    });
  }

  /**
   * List gaps.
   */
  async listGaps(frameworkId?: string, status?: string): Promise<ControlGap[]> {
    const gaps = await this.adapter.listGaps(frameworkId);

    if (status) {
      return gaps.filter((gap) => gap.status === status);
    }

    return gaps;
  }

  // Mapping management

  /**
   * Map control to policy.
   */
  async mapControlToPolicy(
    frameworkId: string,
    controlId: string,
    policyId: string,
    notes?: string
  ): Promise<void> {
    const mapping: ControlMapping = {
      frameworkId,
      controlId,
      type: 'policy',
      targetId: policyId,
      targetName: policyId, // TODO: Fetch actual policy name
      notes,
      mappedAt: new Date().toISOString(),
    };

    await this.adapter.addMapping(mapping);
  }

  /**
   * Map control to role.
   */
  async mapControlToRole(
    frameworkId: string,
    controlId: string,
    roleId: string,
    notes?: string
  ): Promise<void> {
    const mapping: ControlMapping = {
      frameworkId,
      controlId,
      type: 'role',
      targetId: roleId,
      targetName: roleId, // TODO: Fetch actual role name
      notes,
      mappedAt: new Date().toISOString(),
    };

    await this.adapter.addMapping(mapping);
  }

  /**
   * Map control to method.
   */
  async mapControlToMethod(
    frameworkId: string,
    controlId: string,
    methodId: string,
    notes?: string
  ): Promise<void> {
    const mapping: ControlMapping = {
      frameworkId,
      controlId,
      type: 'method',
      targetId: methodId,
      targetName: methodId, // TODO: Fetch actual method name
      notes,
      mappedAt: new Date().toISOString(),
    };

    await this.adapter.addMapping(mapping);
  }

  /**
   * Get mappings for controls.
   */
  async getMappings(
    frameworkId: string,
    controlId?: string
  ): Promise<ControlMapping[]> {
    return this.adapter.getMappings(frameworkId, controlId);
  }

  // Analytics

  /**
   * Get framework statistics.
   */
  async getStatistics(frameworkId: string): Promise<FrameworkStatistics> {
    const framework = await this.adapter.getFramework(frameworkId);
    const controls = await this.adapter.listControls(frameworkId);
    const assessments = await this.adapter.listAssessments(frameworkId);
    const gaps = await this.adapter.listGaps(frameworkId);

    // Calculate control statistics
    const controlsByStatus: Record<ImplementationStatus, number> = {
      [ImplementationStatus.IMPLEMENTED]: 0,
      [ImplementationStatus.PARTIAL]: 0,
      [ImplementationStatus.NOT_IMPLEMENTED]: 0,
      [ImplementationStatus.NOT_APPLICABLE]: 0,
    };

    const controlsByMaturity: Record<MaturityLevel, number> = {
      [MaturityLevel.LEVEL_0]: 0,
      [MaturityLevel.LEVEL_1]: 0,
      [MaturityLevel.LEVEL_2]: 0,
      [MaturityLevel.LEVEL_3]: 0,
    };

    const controlsByCategory: Record<string, number> = {};

    controls.forEach((control) => {
      controlsByStatus[control.implementationStatus]++;
      controlsByMaturity[control.maturityLevel]++;
      controlsByCategory[control.category] =
        (controlsByCategory[control.category] || 0) + 1;
    });

    // Calculate assessment statistics
    const completedAssessments = assessments.filter(
      (a) => a.status === 'completed' || a.status === 'approved'
    );
    const inProgressAssessments = assessments.filter(
      (a) => a.status === 'in-progress'
    );

    const lastAssessment = completedAssessments.length
      ? completedAssessments[completedAssessments.length - 1]
      : undefined;

    // Calculate gap statistics
    const gapsByImpact: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    gaps.forEach((gap) => {
      gapsByImpact[gap.impact]++;
    });

    const statistics: FrameworkStatistics = {
      framework: {
        id: framework.id,
        name: framework.name,
        version: framework.version,
      },
      controls: {
        total: controls.length,
        byStatus: controlsByStatus,
        byMaturity: controlsByMaturity,
        byCategory: controlsByCategory,
      },
      assessments: {
        total: assessments.length,
        completed: completedAssessments.length,
        inProgress: inProgressAssessments.length,
        lastAssessment: lastAssessment
          ? {
              date: lastAssessment.assessmentDate,
              compliancePercentage: lastAssessment.results.compliancePercentage,
              overallMaturity: lastAssessment.maturityScore.overall,
            }
          : undefined,
      },
      gaps: {
        total: gaps.length,
        open: gaps.filter((g) => g.status === 'open').length,
        inProgress: gaps.filter((g) => g.status === 'in-progress').length,
        resolved: gaps.filter((g) => g.status === 'resolved').length,
        byImpact: gapsByImpact,
      },
      complianceTrend: [], // TODO: Calculate from assessment history
      maturityTrend: [], // TODO: Calculate from assessment history
    };

    return statistics;
  }

  /**
   * Get framework dashboard.
   */
  async getDashboard(frameworkId: string): Promise<FrameworkDashboard> {
    const framework = await this.adapter.getFramework(frameworkId);
    const statistics = await this.getStatistics(frameworkId);
    const gaps = await this.adapter.listGaps(frameworkId);
    const assessments = await this.adapter.listAssessments(frameworkId);

    // Get high-priority gaps
    const priorityGaps = gaps
      .filter((g) => g.status === 'open' && (g.impact === 'high' || g.impact === 'critical'))
      .sort((a, b) => {
        const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      })
      .slice(0, 10);

    // Get upcoming assessments
    const now = new Date();
    const upcomingAssessments = assessments
      .filter((a) => a.status === 'planned' || a.status === 'in-progress')
      .sort(
        (a, b) =>
          new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime()
      )
      .slice(0, 5);

    // Get controls requiring attention
    const controls = await this.adapter.listControls(frameworkId);
    const attentionRequired = controls.filter((c) => {
      // Controls that are not implemented or partial
      if (
        c.implementationStatus === ImplementationStatus.NOT_IMPLEMENTED ||
        c.implementationStatus === ImplementationStatus.PARTIAL
      ) {
        return true;
      }

      // Controls that haven't been assessed recently
      if (c.nextAssessment) {
        const nextAssessment = new Date(c.nextAssessment);
        if (nextAssessment < now) {
          return true;
        }
      }

      return false;
    }).slice(0, 10);

    // TODO: Get recent activity from event log
    const recentActivity: FrameworkActivity[] = [];

    return {
      framework,
      statistics,
      priorityGaps,
      upcomingAssessments,
      attentionRequired,
      recentActivity,
    };
  }

  /**
   * Get compliance trend.
   */
  async getComplianceTrend(
    frameworkId: string,
    startDate: string,
    endDate: string
  ): Promise<ComplianceTrendData[]> {
    // TODO: Implement compliance trend calculation
    return [];
  }

  /**
   * Get maturity trend.
   */
  async getMaturityTrend(
    frameworkId: string,
    startDate: string,
    endDate: string
  ): Promise<MaturityTrendData[]> {
    // TODO: Implement maturity trend calculation
    return [];
  }

  // Control identification

  /**
   * Get controls requiring assessment.
   */
  async getControlsRequiringAssessment(frameworkId: string): Promise<Control[]> {
    const controls = await this.adapter.listControls(frameworkId);
    const now = new Date();

    return controls.filter((c) => {
      if (!c.nextAssessment) {
        return true;
      }

      const nextAssessment = new Date(c.nextAssessment);
      return nextAssessment <= now;
    });
  }

  /**
   * Get high-priority gaps.
   */
  async getHighPriorityGaps(frameworkId: string): Promise<ControlGap[]> {
    const gaps = await this.adapter.listGaps(frameworkId);

    return gaps
      .filter((g) => g.status === 'open' && (g.impact === 'high' || g.impact === 'critical'))
      .sort((a, b) => {
        const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      });
  }

  /**
   * Get controls requiring attention.
   */
  async getControlsRequiringAttention(frameworkId: string): Promise<Control[]> {
    const controls = await this.adapter.listControls(frameworkId);
    const now = new Date();

    return controls.filter((c) => {
      // Not implemented or partial
      if (
        c.implementationStatus === ImplementationStatus.NOT_IMPLEMENTED ||
        c.implementationStatus === ImplementationStatus.PARTIAL
      ) {
        return true;
      }

      // Assessment overdue
      if (c.nextAssessment) {
        const nextAssessment = new Date(c.nextAssessment);
        if (nextAssessment < now) {
          return true;
        }
      }

      // Low maturity
      if (
        c.maturityLevel === MaturityLevel.LEVEL_0 ||
        c.maturityLevel === MaturityLevel.LEVEL_1
      ) {
        return true;
      }

      return false;
    });
  }
}
