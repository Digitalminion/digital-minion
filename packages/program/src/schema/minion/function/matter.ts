/**
 * Matter Function Schema
 *
 * Defines types for incident response, requests, vulnerabilities, and other
 * reactive work that requires tracking, investigation, and resolution.
 *
 * Backend Mapping:
 * - Matter → Backend Milestone (conceptual container)
 * - Activity → Backend Task
 * - DiscreteTask → Backend Subtask
 */

import { WorkItem, Priority, Comment, Attachment, Dependency, Link } from '../standard';

/**
 * MatterType categorizes different kinds of reactive work.
 */
export enum MatterType {
  /** Security incident requiring investigation and response */
  INCIDENT = 'incident',

  /** User or system request for action */
  REQUEST = 'request',

  /** Discovered security vulnerability */
  VULNERABILITY = 'vulnerability',

  /** Compliance requirement or audit finding */
  COMPLIANCE = 'compliance',

  /** Investigation or analysis work */
  INVESTIGATION = 'investigation',

  /** Policy violation or exception */
  POLICY_VIOLATION = 'policy-violation',

  /** General issue or problem */
  ISSUE = 'issue'
}

/**
 * MatterSeverity indicates the urgency and impact of the matter.
 */
export enum MatterSeverity {
  /** Requires immediate attention, critical impact */
  CRITICAL = 'critical',

  /** Significant impact, needs prompt attention */
  HIGH = 'high',

  /** Moderate impact, normal priority */
  MEDIUM = 'medium',

  /** Minor impact, can be addressed when time permits */
  LOW = 'low',

  /** Informational, no action required */
  INFO = 'info'
}

/**
 * MatterStatus tracks the lifecycle of a matter.
 */
export enum MatterStatus {
  /** Just reported, not yet triaged */
  NEW = 'new',

  /** Triaged and assigned, investigation in progress */
  INVESTIGATING = 'investigating',

  /** Working on resolution */
  RESOLVING = 'resolving',

  /** Escalated to higher authority or external team */
  ESCALATED = 'escalated',

  /** Waiting on external input or dependency */
  WAITING = 'waiting',

  /** Successfully resolved */
  RESOLVED = 'resolved',

  /** Closed without resolution (duplicate, invalid, etc.) */
  CLOSED = 'closed'
}

/**
 * ActivityType categorizes different investigation activities.
 */
export enum ActivityType {
  /** Initial triage and assessment */
  TRIAGE = 'triage',

  /** Investigation and analysis */
  INVESTIGATION = 'investigation',

  /** Containment actions */
  CONTAINMENT = 'containment',

  /** Remediation work */
  REMEDIATION = 'remediation',

  /** Communication with stakeholders */
  COMMUNICATION = 'communication',

  /** Documentation and reporting */
  DOCUMENTATION = 'documentation',

  /** Follow-up actions */
  FOLLOWUP = 'followup'
}

/**
 * SLAConfig defines service level agreement timings.
 */
export interface SLAConfig {
  /** Time to first response (minutes) */
  responseTime: number;

  /** Time to resolution (minutes) */
  resolutionTime: number;

  /** Business hours only? */
  businessHoursOnly: boolean;

  /** Custom SLA rules */
  customRules?: SLARule[];
}

/**
 * SLARule defines conditional SLA requirements.
 */
export interface SLARule {
  /** Rule name */
  name: string;

  /** Condition (e.g., severity=critical) */
  condition: string;

  /** Response time override (minutes) */
  responseTime?: number;

  /** Resolution time override (minutes) */
  resolutionTime?: number;
}

/**
 * SLAStatus tracks SLA compliance.
 */
export interface SLAStatus {
  /** Time when matter was reported */
  reportedAt: string;

  /** Time when first response was provided */
  firstResponseAt?: string;

  /** Time when matter was resolved */
  resolvedAt?: string;

  /** Target response time */
  responseTargetAt: string;

  /** Target resolution time */
  resolutionTargetAt: string;

  /** Minutes until response SLA breach */
  responseMinutesRemaining?: number;

  /** Minutes until resolution SLA breach */
  resolutionMinutesRemaining?: number;

  /** Whether response SLA was met */
  responseMet?: boolean;

  /** Whether resolution SLA was met */
  resolutionMet?: boolean;

  /** Whether SLA is currently breached */
  isBreached: boolean;
}

/**
 * Matter represents an incident, request, or other reactive work item.
 */
export interface Matter extends WorkItem {
  /** Matter type */
  type: MatterType;

  /** Matter severity */
  severity: MatterSeverity;

  /** Matter status */
  status: MatterStatus;

  /** When the matter was reported */
  reportedAt: string;

  /** Who reported the matter */
  reportedBy?: string;

  /** SLA configuration */
  sla: SLAConfig;

  /** Current SLA status */
  slaStatus: SLAStatus;

  /** Investigation activities */
  activities: Activity[];

  /** Affected systems or users */
  affectedSystems?: string[];

  /** Root cause (once determined) */
  rootCause?: string;

  /** Resolution summary */
  resolutionSummary?: string;

  /** Related matters */
  relatedMatters?: string[];

  /** Comments on the matter */
  comments?: Comment[];

  /** Attachments (evidence, screenshots, logs) */
  attachments?: Attachment[];

  /** Dependencies */
  dependencies?: Dependency[];

  /** External links */
  links?: Link[];
}

/**
 * Activity represents an investigation or response activity.
 */
export interface Activity {
  /** Activity ID */
  id: string;

  /** Parent matter ID */
  matterId: string;

  /** Activity type */
  type: ActivityType;

  /** Activity name/title */
  name: string;

  /** Detailed description of the activity */
  description?: string;

  /** Completion status */
  completed: boolean;

  /** When the activity started */
  startedAt?: string;

  /** When the activity was completed */
  completedAt?: string;

  /** Who performed the activity */
  performedBy?: string;

  /** Discrete tasks within this activity */
  discreteTasks: DiscreteTask[];

  /** Findings or outcomes */
  findings?: string;

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * DiscreteTask represents a specific task within an activity.
 */
export interface DiscreteTask {
  /** Task ID */
  id: string;

  /** Parent activity ID */
  activityId: string;

  /** Task name */
  name: string;

  /** Task description */
  description?: string;

  /** Completion status */
  completed: boolean;

  /** Assigned to */
  assignee?: string;

  /** Due date */
  dueDate?: string;

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new matter
 */
export interface CreateMatterInput {
  name: string;
  description?: string;
  type: MatterType;
  severity: MatterSeverity;
  reportedBy?: string;
  affectedSystems?: string[];
  sla?: Partial<SLAConfig>;
  tags?: string[];
}

/**
 * Input for creating a new activity
 */
export interface CreateActivityInput {
  matterId: string;
  type: ActivityType;
  name: string;
  description?: string;
  performedBy?: string;
}

/**
 * Input for creating a discrete task
 */
export interface CreateDiscreteTaskInput {
  activityId: string;
  name: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
}

/**
 * Input for updating matter status
 */
export interface UpdateMatterStatusInput {
  matterId: string;
  status: MatterStatus;
  resolutionSummary?: string;
  rootCause?: string;
}

/**
 * Input for escalating a matter
 */
export interface EscalateMatterInput {
  matterId: string;
  escalateTo: string;
  reason: string;
  urgency?: 'immediate' | 'urgent' | 'normal';
}

/**
 * Matter statistics and metrics
 */
export interface MatterStatistics {
  /** Total matters */
  total: number;

  /** By status */
  byStatus: Record<MatterStatus, number>;

  /** By severity */
  bySeverity: Record<MatterSeverity, number>;

  /** By type */
  byType: Record<MatterType, number>;

  /** SLA metrics */
  sla: {
    /** Total with breached SLA */
    breached: number;

    /** Average response time (minutes) */
    averageResponseTime: number;

    /** Average resolution time (minutes) */
    averageResolutionTime: number;

    /** Response SLA met percentage */
    responseMeetPercentage: number;

    /** Resolution SLA met percentage */
    resolutionMeetPercentage: number;
  };

  /** Matters at risk of SLA breach */
  atRisk: Matter[];

  /** Recently resolved matters */
  recentlyResolved: Matter[];
}

/**
 * Matter filter for searching and filtering
 */
export interface MatterFilter {
  /** Filter by type */
  type?: MatterType[];

  /** Filter by severity */
  severity?: MatterSeverity[];

  /** Filter by status */
  status?: MatterStatus[];

  /** Filter by assignee */
  assignee?: string[];

  /** Filter by reporter */
  reportedBy?: string[];

  /** Filter by affected systems */
  affectedSystems?: string[];

  /** Filter by SLA status */
  slaStatus?: 'ok' | 'at-risk' | 'breached';

  /** Filter by reported date range */
  reportedFrom?: string;
  reportedTo?: string;

  /** Text search */
  search?: string;

  /** Include closed matters */
  includeClosed?: boolean;
}

/**
 * Matter timeline event for audit trail
 */
export interface MatterTimelineEvent {
  /** Event ID */
  id: string;

  /** Event type */
  type: 'created' | 'status-change' | 'severity-change' | 'assignment' | 'escalation' |
        'activity-added' | 'comment-added' | 'resolved' | 'closed';

  /** Event timestamp */
  timestamp: string;

  /** Who triggered the event */
  actor: string;

  /** Event description */
  description: string;

  /** Previous value (for changes) */
  previousValue?: any;

  /** New value (for changes) */
  newValue?: any;

  /** Additional metadata */
  metadata?: Record<string, any>;
}
