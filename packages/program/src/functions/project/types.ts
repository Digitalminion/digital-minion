/**
 * Project function type - for planned work with features and stages.
 *
 * Mapping to Asana:
 * - Project → Asana Project (1:1)
 * - Feature → Asana Milestone
 * - Stage → Asana Section
 * - Task → Asana Task
 * - Subtask → Asana Subtask
 */

import { WorkItem } from '../../core/types';

/**
 * Project stages represent phases of work.
 * Default stages: backlog, scoping, working, validating, documenting, delivered
 */
export type ProjectStage =
  | 'backlog'
  | 'scoping'
  | 'working'
  | 'validating'
  | 'documenting'
  | 'delivered'
  | string; // Allow custom stages

/**
 * Project status
 */
export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on-hold'
  | 'completed'
  | 'cancelled';

/**
 * Feature status
 */
export type FeatureStatus = 'planned' | 'in-progress' | 'complete';

/**
 * Project represents planned work with features, stages, tasks, and subtasks.
 * Maps 1:1 with Asana Project.
 */
export interface Project extends WorkItem {
  /** Project status */
  status: ProjectStatus;

  /** Features within this project */
  features: Feature[];

  /** Stages for organizing tasks */
  stages: string[];

  /** Project owner */
  owner?: string;

  /** Target completion date */
  targetDate?: string;

  /** Progress metrics */
  progress?: {
    totalFeatures: number;
    completedFeatures: number;
    totalTasks: number;
    completedTasks: number;
  };
}

/**
 * Feature represents a milestone within a project.
 * Maps to Asana Milestone.
 */
export interface Feature {
  /** Unique identifier */
  id: string;

  /** Parent project ID */
  projectId: string;

  /** Feature name */
  name: string;

  /** Optional description */
  description?: string;

  /** Feature status */
  status: FeatureStatus;

  /** Target completion date */
  targetDate?: string;

  /** Tasks associated with this feature */
  tasks: ProjectTask[];

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * ProjectTask represents a task within a project/feature.
 * Maps to Asana Task.
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

  /** Optional description */
  description?: string;

  /** Completion status */
  completed: boolean;

  /** Current stage */
  stage?: ProjectStage;

  /** Optional due date */
  dueDate?: string;

  /** Optional assignee */
  assignee?: string;

  /** Tags */
  tags?: string[];

  /** Subtasks */
  subtasks: ProjectSubtask[];

  /** Backend-specific ID */
  _backendId?: string;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * ProjectSubtask represents a discrete task within a project task.
 * Maps to Asana Subtask.
 */
export interface ProjectSubtask {
  /** Unique identifier */
  id: string;

  /** Parent task ID */
  taskId: string;

  /** Subtask name */
  name: string;

  /** Completion status */
  completed: boolean;

  /** Optional assignee */
  assignee?: string;

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
  stages?: string[];
}

/**
 * Input for creating a new feature
 */
export interface CreateFeatureInput {
  projectId: string;
  name: string;
  description?: string;
  targetDate?: string;
}

/**
 * Input for creating a new project task
 */
export interface CreateProjectTaskInput {
  projectId: string;
  featureId?: string;
  name: string;
  description?: string;
  stage?: ProjectStage;
  dueDate?: string;
  assignee?: string;
  tags?: string[];
}

/**
 * Input for creating a new project subtask
 */
export interface CreateProjectSubtaskInput {
  taskId: string;
  name: string;
  assignee?: string;
}
