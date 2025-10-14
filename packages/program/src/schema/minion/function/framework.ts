/**
 * Framework Function Schema
 *
 * Defines types for control frameworks and compliance management.
 *
 * Control frameworks provide structured approaches to governance,
 * risk management, compliance, and security (e.g., NIST CSF, ISO 27001).
 *
 * Storage Mapping:
 * - ControlFramework → Stored in packages/program/src/framework/{framework-name}/framework.json
 * - Control → Stored in .minion/local with partition schema
 * - Assessment → Stored in packages/program/src/framework/{framework-name}/assessments/
 * - Mapping → Stored in packages/program/src/framework/{framework-name}/mappings/
 */

import { WorkItem, Priority, Comment, Attachment, Link } from '../standard';

/**
 * ImplementationStatus represents the state of control implementation.
 */
export enum ImplementationStatus {
  /** Control has been fully implemented */
  IMPLEMENTED = 'implemented',

  /** Control is partially implemented */
  PARTIAL = 'partial',

  /** Control has not been implemented */
  NOT_IMPLEMENTED = 'not-implemented',

  /** Control is not applicable to the organization */
  NOT_APPLICABLE = 'not-applicable'
}

/**
 * MaturityLevel represents the maturity of implementation (0-3 scale).
 */
export enum MaturityLevel {
  /** Partial - Organizational practices are not formalized */
  LEVEL_0 = '0',

  /** Risk Informed - Practices approved by management but not policy */
  LEVEL_1 = '1',

  /** Repeatable - Practices formally approved and expressed as policy */
  LEVEL_2 = '2',

  /** Adaptive - Organization adapts practices based on lessons learned */
  LEVEL_3 = '3'
}

/**
 * AssessmentStatus represents the state of an assessment.
 */
export enum AssessmentStatus {
  /** Assessment is planned */
  PLANNED = 'planned',

  /** Assessment is in progress */
  IN_PROGRESS = 'in-progress',

  /** Assessment is completed */
  COMPLETED = 'completed',

  /** Assessment is under review */
  UNDER_REVIEW = 'under-review',

  /** Assessment is approved */
  APPROVED = 'approved'
}

/**
 * EvidenceType represents types of evidence for control compliance.
 */
export enum EvidenceType {
  /** Documentation (policies, procedures) */
  DOCUMENTATION = 'documentation',

  /** Screenshots or images */
  SCREENSHOT = 'screenshot',

  /** Log files or audit trails */
  AUDIT_LOG = 'audit-log',

  /** Configuration files */
  CONFIGURATION = 'configuration',

  /** Test results */
  TEST_RESULT = 'test-result',

  /** Interview or attestation */
  ATTESTATION = 'attestation',

  /** System output or report */
  SYSTEM_OUTPUT = 'system-output'
}

/**
 * ControlFramework represents a control framework adopted by the organization.
 */
export interface ControlFramework {
  /** Unique identifier */
  id: string;

  /** Framework name */
  name: string;

  /** Framework version */
  version: string;

  /** When the framework was adopted */
  adoptedDate: string;

  /** Description */
  description?: string;

  /** Organization responsible for the framework */
  organization: string;

  /** Team responsible for the framework */
  team: string;

  /** Framework categories/functions */
  categories: FrameworkCategory[];

  /** Maturity level definitions */
  maturityLevels: MaturityLevelDefinition[];

  /** Scope of application */
  scope: FrameworkScope;

  /** Framework status */
  status: 'active' | 'deprecated' | 'draft';

  /** Total number of controls */
  totalControls: number;

  /** Last assessment date */
  lastAssessmentDate?: string;

  /** Next assessment date */
  nextAssessmentDate?: string;

  /** Custom properties */
  customProperties?: Record<string, any>;

  /** Metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
  };
}

/**
 * FrameworkCategory represents a category/function within a framework.
 */
export interface FrameworkCategory {
  /** Category ID */
  id: string;

  /** Category name */
  name: string;

  /** Description */
  description?: string;

  /** Order in the framework */
  order: number;
}

/**
 * MaturityLevelDefinition defines a maturity level in the framework.
 */
export interface MaturityLevelDefinition {
  /** Level number (0-3) */
  level: number;

  /** Level name */
  name: string;

  /** Description */
  description: string;
}

/**
 * FrameworkScope defines where the framework applies.
 */
export interface FrameworkScope {
  /** Administrative unit */
  administrativeUnit: string;

  /** Business unit */
  businessUnit: string;

  /** Applicable organizations (* for all) */
  applicableOrganizations: string[];

  /** Applicable teams (* for all) */
  applicableTeams: string[];
}

/**
 * Control represents an individual control within a framework.
 */
export interface Control {
  /** Unique identifier */
  id: string;

  /** Control ID from framework (e.g., ID.AM-1, PR.AC-1) */
  controlId: string;

  /** Parent framework ID */
  frameworkId: string;

  /** Framework name */
  frameworkName: string;

  /** Category/function */
  category: string;

  /** Subcategory */
  subcategory?: string;

  /** Control name/title */
  name: string;

  /** Detailed description */
  description: string;

  /** Implementation guidance */
  guidance?: string;

  /** Implementation status */
  implementationStatus: ImplementationStatus;

  /** Maturity level */
  maturityLevel: MaturityLevel;

  /** Priority */
  priority?: Priority;

  /** Assignment information */
  assignedTo: ControlAssignment;

  /** Mapped policies */
  mappedPolicies: string[];

  /** Mapped roles */
  mappedRoles: string[];

  /** Mapped methods */
  mappedMethods: string[];

  /** Reference frameworks/standards */
  references: string[];

  /** Evidence locations */
  evidenceLocations: EvidenceLocation[];

  /** Last assessment date */
  lastAssessed?: string;

  /** Next assessment date */
  nextAssessment?: string;

  /** Assessment notes */
  assessmentNotes?: string;

  /** Implementation notes */
  notes?: string;

  /** Tags */
  tags?: string[];

  /** Comments */
  comments?: Comment[];

  /** Attachments */
  attachments?: Attachment[];

  /** Links */
  links?: Link[];

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
    version?: number;
  };
}

/**
 * ControlAssignment defines who is responsible for a control.
 */
export interface ControlAssignment {
  /** Organization */
  organization: string;

  /** Team */
  team: string;

  /** Roles responsible for control */
  roles: string[];

  /** Specific assignee (user) */
  assignee?: string;
}

/**
 * EvidenceLocation points to evidence for control compliance.
 */
export interface EvidenceLocation {
  /** Evidence type */
  type: EvidenceType;

  /** Location URI (filesystem://, service://, etc.) */
  uri: string;

  /** Description */
  description?: string;

  /** Last verified date */
  lastVerified?: string;
}

/**
 * ControlAssessment represents an assessment of controls.
 */
export interface ControlAssessment {
  /** Unique identifier */
  id: string;

  /** Assessment name */
  name: string;

  /** Framework being assessed */
  frameworkId: string;

  /** Framework name */
  frameworkName: string;

  /** Assessment date */
  assessmentDate: string;

  /** Assessor (person or position) */
  assessor: string;

  /** Assessment status */
  status: AssessmentStatus;

  /** Scope of assessment */
  scope: AssessmentScope;

  /** Assessment results */
  results: AssessmentResults;

  /** Maturity scores by category */
  maturityScore: MaturityScore;

  /** Identified gaps */
  gaps: ControlGap[];

  /** Findings */
  findings: AssessmentFinding[];

  /** Recommendations */
  recommendations: string[];

  /** Assessment methodology */
  methodology?: string;

  /** Assessment period */
  period?: {
    startDate: string;
    endDate: string;
  };

  /** Sign-off information */
  signOff?: {
    approver: string;
    approvedDate?: string;
    notes?: string;
  };

  /** Comments */
  comments?: Comment[];

  /** Attachments */
  attachments?: Attachment[];

  /** Metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
  };
}

/**
 * AssessmentScope defines what is being assessed.
 */
export interface AssessmentScope {
  /** Organization */
  organization: string;

  /** Team */
  team: string;

  /** Specific controls (if not all) */
  controls?: string[];

  /** Categories (if not all) */
  categories?: string[];
}

/**
 * AssessmentResults summarizes assessment outcomes.
 */
export interface AssessmentResults {
  /** Total controls assessed */
  totalControls: number;

  /** Number assessed */
  assessed: number;

  /** Number implemented */
  implemented: number;

  /** Number partially implemented */
  partiallyImplemented: number;

  /** Number not implemented */
  notImplemented: number;

  /** Number not applicable */
  notApplicable: number;

  /** Overall compliance percentage */
  compliancePercentage: number;
}

/**
 * MaturityScore tracks maturity by category.
 */
export interface MaturityScore {
  /** Overall maturity score */
  overall: number;

  /** Scores by category */
  byCategory: Record<string, number>;
}

/**
 * ControlGap represents an identified control gap.
 */
export interface ControlGap {
  /** Control ID */
  controlId: string;

  /** Control name */
  controlName: string;

  /** Issue description */
  issue: string;

  /** Impact assessment */
  impact: 'low' | 'medium' | 'high' | 'critical';

  /** Remediation plan */
  remediation: string;

  /** Due date for remediation */
  dueDate?: string;

  /** Assigned to */
  assignedTo?: string;

  /** Status */
  status: 'open' | 'in-progress' | 'resolved' | 'accepted';
}

/**
 * AssessmentFinding represents a finding from assessment.
 */
export interface AssessmentFinding {
  /** Finding ID */
  id: string;

  /** Related control ID */
  controlId?: string;

  /** Finding type */
  type: 'gap' | 'observation' | 'best-practice' | 'risk';

  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Finding description */
  description: string;

  /** Recommendation */
  recommendation?: string;

  /** Evidence references */
  evidenceRefs?: string[];
}

/**
 * ControlMapping maps controls to organizational elements.
 */
export interface ControlMapping {
  /** Framework ID */
  frameworkId: string;

  /** Control ID */
  controlId: string;

  /** Mapping type */
  type: 'policy' | 'role' | 'method' | 'position' | 'custom';

  /** Target ID (policy ID, role ID, etc.) */
  targetId: string;

  /** Target name */
  targetName: string;

  /** Mapping notes */
  notes?: string;

  /** When mapped */
  mappedAt: string;

  /** Who mapped */
  mappedBy?: string;
}

/**
 * CrossFrameworkMapping maps controls across frameworks.
 */
export interface CrossFrameworkMapping {
  /** Primary control */
  primaryControl: {
    frameworkId: string;
    controlId: string;
  };

  /** Mapped controls in other frameworks */
  mappedControls: Array<{
    frameworkId: string;
    controlId: string;
    relationship: 'equivalent' | 'subset' | 'superset' | 'related';
  }>;

  /** Unified implementation reference */
  unifiedImplementation?: {
    policyId?: string;
    methodId?: string;
    roleIds?: string[];
  };
}

/**
 * Input for creating a control framework
 */
export interface CreateFrameworkInput {
  id: string;
  name: string;
  version: string;
  adoptedDate: string;
  description?: string;
  organization: string;
  team: string;
  categories: Omit<FrameworkCategory, 'order'>[];
  maturityLevels?: MaturityLevelDefinition[];
  scope: FrameworkScope;
}

/**
 * Input for creating a control
 */
export interface CreateControlInput {
  controlId: string;
  frameworkId: string;
  category: string;
  subcategory?: string;
  name: string;
  description: string;
  guidance?: string;
  implementationStatus: ImplementationStatus;
  maturityLevel: MaturityLevel;
  priority?: Priority;
  assignedTo: ControlAssignment;
  references?: string[];
  mappedPolicies?: string[];
  mappedRoles?: string[];
  mappedMethods?: string[];
}

/**
 * Input for creating an assessment
 */
export interface CreateAssessmentInput {
  name: string;
  frameworkId: string;
  assessmentDate: string;
  assessor: string;
  scope: AssessmentScope;
  methodology?: string;
  period?: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Input for updating control implementation
 */
export interface UpdateControlImplementationInput {
  controlId: string;
  implementationStatus: ImplementationStatus;
  maturityLevel: MaturityLevel;
  notes?: string;
  evidenceLocations?: EvidenceLocation[];
}

/**
 * Input for adding evidence to control
 */
export interface AddEvidenceInput {
  controlId: string;
  evidence: EvidenceLocation;
}

/**
 * Input for adding a control gap
 */
export interface AddControlGapInput {
  assessmentId: string;
  controlId: string;
  issue: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  remediation: string;
  dueDate?: string;
  assignedTo?: string;
}

/**
 * Framework statistics and metrics
 */
export interface FrameworkStatistics {
  /** Framework info */
  framework: {
    id: string;
    name: string;
    version: string;
  };

  /** Control statistics */
  controls: {
    total: number;
    byStatus: Record<ImplementationStatus, number>;
    byMaturity: Record<MaturityLevel, number>;
    byCategory: Record<string, number>;
  };

  /** Assessment statistics */
  assessments: {
    total: number;
    completed: number;
    inProgress: number;
    lastAssessment?: {
      date: string;
      compliancePercentage: number;
      overallMaturity: number;
    };
  };

  /** Gap statistics */
  gaps: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    byImpact: Record<string, number>;
  };

  /** Compliance trend */
  complianceTrend: ComplianceTrendData[];

  /** Maturity trend */
  maturityTrend: MaturityTrendData[];
}

/**
 * Compliance trend data point
 */
export interface ComplianceTrendData {
  /** Date */
  date: string;

  /** Compliance percentage */
  compliancePercentage: number;

  /** Number of implemented controls */
  implementedControls: number;

  /** Total controls */
  totalControls: number;
}

/**
 * Maturity trend data point
 */
export interface MaturityTrendData {
  /** Date */
  date: string;

  /** Overall maturity score */
  overallMaturity: number;

  /** Maturity by category */
  byCategory: Record<string, number>;
}

/**
 * Framework dashboard data
 */
export interface FrameworkDashboard {
  /** Framework info */
  framework: ControlFramework;

  /** Statistics */
  statistics: FrameworkStatistics;

  /** High-priority gaps */
  priorityGaps: ControlGap[];

  /** Upcoming assessments */
  upcomingAssessments: ControlAssessment[];

  /** Controls requiring attention */
  attentionRequired: Control[];

  /** Recent activity */
  recentActivity: FrameworkActivity[];
}

/**
 * Framework activity log entry
 */
export interface FrameworkActivity {
  /** Activity ID */
  id: string;

  /** Activity type */
  type: 'control-updated' | 'assessment-completed' | 'gap-identified' | 'gap-resolved' | 'mapping-added';

  /** Activity timestamp */
  timestamp: string;

  /** Actor */
  actor?: string;

  /** Activity description */
  description: string;

  /** Related entity ID */
  entityId?: string;

  /** Related entity type */
  entityType?: 'control' | 'assessment' | 'gap' | 'mapping';
}

/**
 * Framework filter for queries
 */
export interface FrameworkFilter {
  /** Filter by framework ID */
  frameworkId?: string;

  /** Filter by implementation status */
  implementationStatus?: ImplementationStatus[];

  /** Filter by maturity level */
  maturityLevel?: MaturityLevel[];

  /** Filter by category */
  category?: string[];

  /** Filter by organization */
  organization?: string;

  /** Filter by team */
  team?: string;

  /** Filter by assignee */
  assignee?: string;

  /** Filter by priority */
  priority?: Priority[];

  /** Filter by assessment date range */
  assessedFrom?: string;
  assessedTo?: string;

  /** Include controls needing assessment */
  needsAssessment?: boolean;

  /** Sort field */
  sortBy?: 'controlId' | 'name' | 'status' | 'maturity' | 'lastAssessed' | 'priority';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}
