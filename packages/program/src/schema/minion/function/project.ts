/**
 * Project Function Schema
 *
 * Defines types for planned work with features, stages, tasks, and subtasks.
 *
 * Backend Mapping:
 * - Project → Backend Project (1:1)
 * - Feature → Backend Milestone
 * - Stage → Backend Section
 * - Task → Backend Task
 * - Subtask → Backend Subtask
 */

import { WorkItem, Priority, TimeEstimate, TimeTracking, Comment, Attachment, Dependency, Link } from '../standard';

/**
 * ProjectStage represents phases of work within a project.
 */
export enum ProjectStage {
  /** Ideas and unrefined work */
  BACKLOG = 'backlog',

  /** Requirements gathering and planning */
  SCOPING = 'scoping',

  /** Active development or execution */
  WORKING = 'working',

  /** Testing and validation */
  VALIDATING = 'validating',

  /** Creating documentation */
  DOCUMENTING = 'documenting',

  /** Completed and delivered */
  DELIVERED = 'delivered'
}

/**
 * ProjectStatus represents the overall state of a project.
 */
export enum ProjectStatus {
  /** Planning phase, not yet started */
  PLANNING = 'planning',

  /** Active work in progress */
  ACTIVE = 'active',

  /** Temporarily paused */
  ON_HOLD = 'on-hold',

  /** Successfully completed */
  COMPLETED = 'completed',

  /** Cancelled before completion */
  CANCELLED = 'cancelled',

  /** Archived for historical reference */
  ARCHIVED = 'archived'
}

/**
 * FeatureStatus represents the state of a feature/milestone.
 */
export enum FeatureStatus {
  /** Planned for future work */
  PLANNED = 'planned',

  /** Currently being worked on */
  IN_PROGRESS = 'in-progress',

  /** Completed */
  COMPLETE = 'complete',

  /** Deferred to later */
  DEFERRED = 'deferred',

  /** Cancelled */
  CANCELLED = 'cancelled'
}

/**
 * TaskPriority for project tasks.
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Project represents planned work with features, stages, and tasks.
 */
export interface Project extends WorkItem {
  /** Project status */
  status: ProjectStatus;

  /** Features/milestones within this project */
  features: Feature[];

  /** Stages for organizing tasks */
  stages: ProjectStage[];

  /** Project owner */
  owner?: string;

  /** Target completion date */
  targetDate?: string;

  /** Actual start date */
  actualStartDate?: string;

  /** Actual completion date */
  actualCompletionDate?: string;

  /** Project budget (if applicable) */
  budget?: {
    allocated?: number;
    spent?: number;
    currency?: string;
  };

  /** Progress metrics */
  progress: ProjectProgress;

  /** Project team members */
  team?: ProjectTeamMember[];

  /** Project goals/objectives */
  goals?: string[];

  /** Success criteria */
  successCriteria?: string[];

  /** Risks */
  risks?: ProjectRisk[];

  /** Comments */
  comments?: Comment[];

  /** Attachments */
  attachments?: Attachment[];

  /** Dependencies */
  dependencies?: Dependency[];

  /** Links */
  links?: Link[];
}

/**
 * ProjectProgress tracks completion metrics.
 */
export interface ProjectProgress {
  /** Total number of features */
  totalFeatures: number;

  /** Completed features */
  completedFeatures: number;

  /** Total number of tasks */
  totalTasks: number;

  /** Completed tasks */
  completedTasks: number;

  /** Total number of subtasks */
  totalSubtasks: number;

  /** Completed subtasks */
  completedSubtasks: number;

  /** Overall completion percentage */
  completionPercentage: number;

  /** Velocity (tasks per week) */
  velocity?: number;

  /** Estimated completion date based on velocity */
  estimatedCompletionDate?: string;
}

/**
 * ProjectTeamMember represents a member working on the project.
 */
export interface ProjectTeamMember {
  /** User ID */
  userId: string;

  /** User name */
  name: string;

  /** Role in project */
  role: 'owner' | 'lead' | 'developer' | 'designer' | 'qa' | 'stakeholder' | 'contributor';

  /** Whether active on project */
  active: boolean;

  /** Tasks assigned to this member */
  assignedTasks?: number;
}

/**
 * ProjectRisk tracks potential issues.
 */
export interface ProjectRisk {
  /** Risk ID */
  id: string;

  /** Risk description */
  description: string;

  /** Impact if occurs */
  impact: 'low' | 'medium' | 'high' | 'critical';

  /** Likelihood of occurring */
  likelihood: 'low' | 'medium' | 'high';

  /** Risk status */
  status: 'open' | 'mitigated' | 'accepted' | 'occurred';

  /** Mitigation plan */
  mitigationPlan?: string;

  /** Who owns this risk */
  owner?: string;
}

/**
 * Feature represents a milestone within a project.
 */
export interface Feature {
  /** Unique identifier */
  id: string;

  /** Parent project ID */
  projectId: string;

  /** Feature name */
  name: string;

  /** Detailed description */
  description?: string;

  /** Feature status */
  status: FeatureStatus;

  /** Priority */
  priority?: TaskPriority;

  /** Target completion date */
  targetDate?: string;

  /** Actual start date */
  actualStartDate?: string;

  /** Actual completion date */
  actualCompletionDate?: string;

  /** Tasks associated with this feature */
  tasks: ProjectTask[];

  /** Feature owner/lead */
  owner?: string;

  /** Dependencies on other features */
  dependsOn?: string[];

  /** Time estimate */
  estimate?: TimeEstimate;

  /** Actual time tracking */
  timeTracking?: TimeTracking;

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * ProjectTask represents a task within a project/feature.
 */
export interface ProjectTask {
  /** Unique identifier */
  id: string;

  /** Parent feature ID (optional - can exist without feature) */
  featureId?: string;

  /** Parent project ID */
  projectId: string;

  /** Task name */
  name: string;

  /** Detailed description */
  description?: string;

  /** Completion status */
  completed: boolean;

  /** Current stage */
  stage: ProjectStage;

  /** Priority */
  priority?: TaskPriority;

  /** Optional due date */
  dueDate?: string;

  /** Actual start date */
  startDate?: string;

  /** Actual completion date */
  completionDate?: string;

  /** Assignee */
  assignee?: string;

  /** Tags */
  tags?: string[];

  /** Subtasks */
  subtasks: ProjectSubtask[];

  /** Task dependencies */
  blockedBy?: string[];

  /** Tasks this task blocks */
  blocks?: string[];

  /** Time estimate */
  estimate?: TimeEstimate;

  /** Actual time tracking */
  timeTracking?: TimeTracking;

  /** Comments */
  comments?: Comment[];

  /** Attachments */
  attachments?: Attachment[];

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * ProjectSubtask represents a discrete task within a project task.
 */
export interface ProjectSubtask {
  /** Unique identifier */
  id: string;

  /** Parent task ID */
  taskId: string;

  /** Subtask name */
  name: string;

  /** Description */
  description?: string;

  /** Completion status */
  completed: boolean;

  /** Assignee */
  assignee?: string;

  /** Due date */
  dueDate?: string;

  /** Completion date */
  completionDate?: string;

  /** Time estimate */
  estimate?: TimeEstimate;

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
  owner?: string;
  targetDate?: string;
  stages?: ProjectStage[];
  goals?: string[];
  budget?: {
    allocated: number;
    currency?: string;
  };
}

/**
 * Input for creating a new feature
 */
export interface CreateFeatureInput {
  projectId: string;
  name: string;
  description?: string;
  priority?: TaskPriority;
  targetDate?: string;
  owner?: string;
  dependsOn?: string[];
}

/**
 * Input for creating a new project task
 */
export interface CreateProjectTaskInput {
  projectId: string;
  featureId?: string;
  name: string;
  description?: string;
  stage: ProjectStage;
  priority?: TaskPriority;
  dueDate?: string;
  assignee?: string;
  tags?: string[];
  estimate?: TimeEstimate;
}

/**
 * Input for creating a new project subtask
 */
export interface CreateProjectSubtaskInput {
  taskId: string;
  name: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  estimate?: TimeEstimate;
}

/**
 * Input for moving a task to a different stage
 */
export interface MoveTaskToStageInput {
  taskId: string;
  stage: ProjectStage;
  notes?: string;
}

/**
 * Input for updating project status
 */
export interface UpdateProjectStatusInput {
  projectId: string;
  status: ProjectStatus;
  notes?: string;
}

/**
 * Project statistics and metrics
 */
export interface ProjectStatistics {
  /** Overall project info */
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    completionPercentage: number;
  };

  /** Feature statistics */
  features: {
    total: number;
    completed: number;
    inProgress: number;
    planned: number;
    deferred: number;
  };

  /** Task statistics */
  tasks: {
    total: number;
    completed: number;
    byStage: Record<ProjectStage, number>;
    byPriority: Record<TaskPriority, number>;
    overdue: number;
  };

  /** Subtask statistics */
  subtasks: {
    total: number;
    completed: number;
  };

  /** Time tracking */
  time: {
    estimatedMinutes: number;
    actualMinutes: number;
    variance: number;
    variancePercentage: number;
  };

  /** Team productivity */
  team: {
    totalMembers: number;
    activeMembers: number;
    tasksPerMember: Record<string, number>;
    completionRateByMember: Record<string, number>;
  };

  /** Timeline */
  timeline: {
    startDate?: string;
    targetDate?: string;
    estimatedCompletionDate?: string;
    daysRemaining?: number;
    isOnTrack: boolean;
  };
}

/**
 * Feature burndown data for visualization
 */
export interface FeatureBurndownData {
  /** Feature info */
  feature: {
    id: string;
    name: string;
    status: FeatureStatus;
  };

  /** Total tasks in feature */
  totalTasks: number;

  /** Completed tasks */
  completedTasks: number;

  /** Completion percentage */
  completionPercentage: number;

  /** Daily data points */
  dataPoints: BurndownDataPoint[];

  /** Ideal burndown line */
  idealLine: BurndownDataPoint[];

  /** Velocity trend */
  velocity: {
    current: number;
    average: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };

  /** Predicted completion */
  prediction: {
    completionDate: string;
    confidenceLevel: number;
  };
}

/**
 * Single data point in burndown chart
 */
export interface BurndownDataPoint {
  /** Date */
  date: string;

  /** Remaining tasks */
  remaining: number;

  /** Completed on this day */
  completed: number;

  /** Added on this day */
  added: number;
}

/**
 * Project velocity calculation
 */
export interface ProjectVelocity {
  /** Time period for calculation */
  period: 'week' | 'sprint' | 'month';

  /** Current velocity (tasks per period) */
  current: number;

  /** Average velocity over time */
  average: number;

  /** Historical velocity data */
  history: VelocityDataPoint[];

  /** Trend direction */
  trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Velocity data point
 */
export interface VelocityDataPoint {
  /** Period identifier */
  period: string;

  /** Tasks completed */
  tasksCompleted: number;

  /** Story points (if used) */
  storyPoints?: number;
}

/**
 * Project health assessment
 */
export interface ProjectHealth {
  /** Overall health status */
  status: 'healthy' | 'at-risk' | 'critical';

  /** Health score (0-100) */
  score: number;

  /** Contributing factors */
  factors: {
    /** Schedule health */
    schedule: HealthFactor;

    /** Scope health */
    scope: HealthFactor;

    /** Team health */
    team: HealthFactor;

    /** Quality health */
    quality: HealthFactor;
  };

  /** Recommendations */
  recommendations: string[];

  /** Red flags */
  redFlags: string[];
}

/**
 * Individual health factor
 */
export interface HealthFactor {
  /** Factor score (0-100) */
  score: number;

  /** Status */
  status: 'good' | 'warning' | 'critical';

  /** Explanation */
  reason: string;
}
