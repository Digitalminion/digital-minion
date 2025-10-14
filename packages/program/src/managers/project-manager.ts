/**
 * Project Manager - Business logic for Project function type.
 *
 * Coordinates between domain model and backend adapter,
 * providing high-level operations for project management.
 */

import { AllBackends } from '@digital-minion/lib';
import { ProgramContext } from '../core/types';
import { ProjectAdapter, IProjectAdapter } from '../adapters/project-adapter';
import {
  Project,
  Feature,
  ProjectTask,
  ProjectSubtask,
  CreateProjectInput,
  CreateFeatureInput,
  CreateProjectTaskInput,
  CreateProjectSubtaskInput,
  ProjectStage,
} from '../functions/project/types';

/**
 * Configuration for Project Manager.
 */
export interface ProjectManagerConfig {
  /** Backend instance */
  backend: AllBackends;

  /** Program context */
  context: ProgramContext;

  /** Optional adapter (will create default if not provided) */
  adapter?: IProjectAdapter;
}

/**
 * Project Manager handles business logic for Project function type.
 */
export class ProjectManager {
  private adapter: IProjectAdapter;

  constructor(private config: ProjectManagerConfig) {
    this.adapter = config.adapter || new ProjectAdapter({
      backend: config.backend,
      context: config.context,
      options: {
        autoCreate: true,
        useTags: true,
      },
    });
  }

  /**
   * Initialize the manager.
   */
  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  // =========================================================================
  // Project Operations
  // =========================================================================

  /**
   * Get the current project.
   */
  async getProject(): Promise<Project> {
    if (!this.config.context.projectId) {
      throw new Error('Project ID not configured in context');
    }

    return this.adapter.getProject(this.config.context.projectId);
  }

  /**
   * Update the current project.
   */
  async updateProject(updates: Partial<Project>): Promise<Project> {
    if (!this.config.context.projectId) {
      throw new Error('Project ID not configured in context');
    }

    return this.adapter.updateProject(this.config.context.projectId, updates);
  }

  // =========================================================================
  // Feature Operations
  // =========================================================================

  /**
   * Create a new feature.
   */
  async createFeature(input: Omit<CreateFeatureInput, 'projectId'>): Promise<Feature> {
    if (!this.config.context.projectId) {
      throw new Error('Project ID not configured in context');
    }

    return this.adapter.createFeature({
      ...input,
      projectId: this.config.context.projectId,
    });
  }

  /**
   * Get a feature by ID.
   */
  async getFeature(featureId: string): Promise<Feature> {
    return this.adapter.getFeature(featureId);
  }

  /**
   * Update a feature.
   */
  async updateFeature(featureId: string, updates: Partial<Feature>): Promise<Feature> {
    return this.adapter.updateFeature(featureId, updates);
  }

  /**
   * Delete a feature.
   */
  async deleteFeature(featureId: string): Promise<void> {
    return this.adapter.deleteFeature(featureId);
  }

  /**
   * List all features.
   */
  async listFeatures(): Promise<Feature[]> {
    if (!this.config.context.projectId) {
      throw new Error('Project ID not configured in context');
    }

    return this.adapter.listFeatures(this.config.context.projectId);
  }

  /**
   * Complete a feature.
   */
  async completeFeature(featureId: string): Promise<Feature> {
    return this.updateFeature(featureId, { status: 'complete' });
  }

  // =========================================================================
  // Task Operations
  // =========================================================================

  /**
   * Create a new task.
   */
  async createTask(input: Omit<CreateProjectTaskInput, 'projectId'>): Promise<ProjectTask> {
    if (!this.config.context.projectId) {
      throw new Error('Project ID not configured in context');
    }

    return this.adapter.createTask({
      ...input,
      projectId: this.config.context.projectId,
    });
  }

  /**
   * Get a task by ID.
   */
  async getTask(taskId: string): Promise<ProjectTask> {
    return this.adapter.getTask(taskId);
  }

  /**
   * Update a task.
   */
  async updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask> {
    return this.adapter.updateTask(taskId, updates);
  }

  /**
   * Delete a task.
   */
  async deleteTask(taskId: string): Promise<void> {
    return this.adapter.deleteTask(taskId);
  }

  /**
   * List all tasks.
   */
  async listTasks(): Promise<ProjectTask[]> {
    if (!this.config.context.projectId) {
      throw new Error('Project ID not configured in context');
    }

    return this.adapter.listTasks(this.config.context.projectId);
  }

  /**
   * Complete a task.
   */
  async completeTask(taskId: string): Promise<ProjectTask> {
    return this.updateTask(taskId, { completed: true });
  }

  /**
   * Move a task to a different stage.
   */
  async moveTaskToStage(taskId: string, stage: ProjectStage): Promise<ProjectTask> {
    return this.adapter.moveTaskToStage(taskId, stage);
  }

  /**
   * Assign a task.
   */
  async assignTask(taskId: string, assignee: string): Promise<ProjectTask> {
    return this.updateTask(taskId, { assignee });
  }

  // =========================================================================
  // Subtask Operations
  // =========================================================================

  /**
   * Create a new subtask.
   */
  async createSubtask(input: CreateProjectSubtaskInput): Promise<ProjectSubtask> {
    return this.adapter.createSubtask(input);
  }

  /**
   * Update a subtask.
   */
  async updateSubtask(subtaskId: string, updates: Partial<ProjectSubtask>): Promise<ProjectSubtask> {
    return this.adapter.updateSubtask(subtaskId, updates);
  }

  /**
   * Delete a subtask.
   */
  async deleteSubtask(subtaskId: string): Promise<void> {
    return this.adapter.deleteSubtask(subtaskId);
  }

  /**
   * Complete a subtask.
   */
  async completeSubtask(subtaskId: string): Promise<ProjectSubtask> {
    return this.updateSubtask(subtaskId, { completed: true });
  }

  // =========================================================================
  // High-Level Operations
  // =========================================================================

  /**
   * Get project statistics.
   */
  async getStatistics(): Promise<{
    totalFeatures: number;
    completedFeatures: number;
    inProgressFeatures: number;
    totalTasks: number;
    completedTasks: number;
    tasksByStage: Record<ProjectStage, number>;
  }> {
    const project = await this.getProject();

    const tasksByStage: Record<string, number> = {};
    project.features.forEach((feature) => {
      feature.tasks.forEach((task) => {
        const stage = task.stage || 'unknown';
        tasksByStage[stage] = (tasksByStage[stage] || 0) + 1;
      });
    });

    return {
      totalFeatures: project.progress?.totalFeatures || 0,
      completedFeatures: project.progress?.completedFeatures || 0,
      inProgressFeatures:
        (project.progress?.totalFeatures || 0) - (project.progress?.completedFeatures || 0),
      totalTasks: project.progress?.totalTasks || 0,
      completedTasks: project.progress?.completedTasks || 0,
      tasksByStage: tasksByStage as Record<ProjectStage, number>,
    };
  }

  /**
   * Get burndown data for a feature.
   */
  async getFeatureBurndown(featureId: string): Promise<{
    feature: Feature;
    totalTasks: number;
    completedTasks: number;
    remainingTasks: number;
    completionPercentage: number;
  }> {
    const feature = await this.getFeature(featureId);

    const totalTasks = feature.tasks.length;
    const completedTasks = feature.tasks.filter((t) => t.completed).length;
    const remainingTasks = totalTasks - completedTasks;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      feature,
      totalTasks,
      completedTasks,
      remainingTasks,
      completionPercentage,
    };
  }
}
