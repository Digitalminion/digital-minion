/**
 * Project adapter for translating Project domain models to backend implementations.
 *
 * Mapping strategy:
 * - Project → Backend Project (1:1)
 * - Feature → Backend Task with is_milestone=true
 * - ProjectTask → Backend Task
 * - ProjectSubtask → Backend Subtask
 * - Stage → Backend Section
 */

import { BaseBackendAdapter, BackendAdapterConfig } from './backend-adapter';
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
import { Task } from '@digital-minion/lib';

/**
 * Project-specific backend adapter interface.
 */
export interface IProjectAdapter {
  // Initialization
  initialize(): Promise<void>;

  // Project operations
  createProject(input: CreateProjectInput): Promise<Project>;
  getProject(projectId: string): Promise<Project>;
  updateProject(projectId: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;

  // Feature operations
  createFeature(input: CreateFeatureInput): Promise<Feature>;
  getFeature(featureId: string): Promise<Feature>;
  updateFeature(featureId: string, updates: Partial<Feature>): Promise<Feature>;
  deleteFeature(featureId: string): Promise<void>;
  listFeatures(projectId: string): Promise<Feature[]>;

  // Task operations
  createTask(input: CreateProjectTaskInput): Promise<ProjectTask>;
  getTask(taskId: string): Promise<ProjectTask>;
  updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask>;
  deleteTask(taskId: string): Promise<void>;
  listTasks(projectId: string): Promise<ProjectTask[]>;
  moveTaskToStage(taskId: string, stage: ProjectStage): Promise<ProjectTask>;

  // Subtask operations
  createSubtask(input: CreateProjectSubtaskInput): Promise<ProjectSubtask>;
  updateSubtask(subtaskId: string, updates: Partial<ProjectSubtask>): Promise<ProjectSubtask>;
  deleteSubtask(subtaskId: string): Promise<void>;
}

/**
 * Default project stages.
 */
const DEFAULT_STAGES: ProjectStage[] = [
  'backlog',
  'scoping',
  'working',
  'validating',
  'documenting',
  'delivered',
];

/**
 * Project adapter implementation.
 * Handles translation between Project domain model and backend primitives.
 */
export class ProjectAdapter extends BaseBackendAdapter implements IProjectAdapter {
  constructor(config: BackendAdapterConfig) {
    super(config.backend, config.context, config.options);
  }

  /**
   * Check if backend supports a feature.
   */
  supportsFeature(feature: string): boolean {
    switch (feature) {
      case 'milestones':
      case 'sections':
      case 'tags':
      case 'subtasks':
      case 'dependencies':
        return true;
      case 'custom-fields':
        return this.context.backendType === 'asana';
      default:
        return false;
    }
  }

  /**
   * Initialize the adapter.
   * Ensures project exists and creates default stages/sections.
   */
  async initialize(): Promise<void> {
    if (!this.context.projectId) {
      throw new Error('Project ID is required in context for ProjectAdapter');
    }

    // Verify project exists
    try {
      await this.backend.project.getProject(this.context.projectId);
    } catch (error) {
      throw new Error(`Project ${this.context.projectId} not found: ${error}`);
    }

    // Create default sections if they don't exist and auto-create is enabled
    if (this.config?.autoCreate) {
      await this.ensureSections(DEFAULT_STAGES);
    }
  }

  /**
   * Ensure stages exist as sections in the backend.
   */
  private async ensureSections(stages: ProjectStage[]): Promise<void> {
    const existingSections = await this.backend.section.listSections(this.context.projectId!);
    const existingNames = new Set(existingSections.map((s) => s.name.toLowerCase()));

    for (const stage of stages) {
      if (!existingNames.has(stage.toLowerCase())) {
        try {
          await this.backend.section.createSection(this.context.projectId!, stage);
        } catch (error) {
          console.warn(`Failed to create section ${stage}:`, error);
        }
      }
    }
  }

  // =========================================================================
  // Project Operations
  // =========================================================================

  /**
   * Create a new project.
   * Note: For Asana, this would require elevated permissions. Most users will
   * configure existing projects. For Local backend, this creates project structure.
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    throw new Error('Project creation not yet implemented. Configure existing projects instead.');
  }

  /**
   * Get a project by ID.
   */
  async getProject(projectId: string): Promise<Project> {
    const backendProject = await this.backend.project.getProject(projectId);
    const features = await this.listFeatures(projectId);
    const tasks = await this.listTasks(projectId);

    const completedFeatures = features.filter((f) => f.status === 'complete').length;
    const completedTasks = tasks.filter((t) => t.completed).length;

    const project: Project = {
      id: this.generateId(),
      name: backendProject.name,
      description: backendProject.notes,
      status: 'active', // Could be derived from project status
      context: this.context,
      features,
      stages: DEFAULT_STAGES,
      progress: {
        totalFeatures: features.length,
        completedFeatures,
        totalTasks: tasks.length,
        completedTasks,
      },
      _backendId: projectId,
      _backendType: this.context.backendType,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    return project;
  }

  /**
   * Update a project.
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const backendUpdates: any = {};

    if (updates.name) backendUpdates.name = updates.name;
    if (updates.description) backendUpdates.notes = updates.description;

    await this.backend.project.updateProject(projectId, backendUpdates);

    return this.getProject(projectId);
  }

  /**
   * Delete a project.
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.backend.project.deleteProject(projectId);
  }

  // =========================================================================
  // Feature Operations
  // =========================================================================

  /**
   * Create a new feature (milestone).
   */
  async createFeature(input: CreateFeatureInput): Promise<Feature> {
    const { projectId, name, description, targetDate } = input;

    // Create as milestone task
    const backendTask = await this.backend.task.createTask(
      name,
      description,
      this.formatDate(targetDate),
      undefined,
      true // is_milestone
    );

    // Add metadata tags
    await this.addMetadataTags(backendTask.gid, ['level:feature']);

    const feature: Feature = {
      id: this.generateId(),
      projectId,
      name: backendTask.name,
      description: backendTask.notes,
      status: backendTask.completed ? 'complete' : 'planned',
      targetDate: backendTask.due_on,
      tasks: [],
      _backendId: backendTask.gid,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    return feature;
  }

  /**
   * Get a feature by ID.
   */
  async getFeature(featureId: string): Promise<Feature> {
    const backendTask = await this.backend.task.getTask(featureId);

    if (!backendTask.is_milestone) {
      throw new Error(`Task ${featureId} is not a milestone/feature`);
    }

    // Get associated tasks (via dependencies or tags)
    const allTasks = await this.backend.task.listTasks();
    const featureTasks = allTasks.filter((t) =>
      t.tags?.includes(`feature:${featureId}`)
    );

    const tasks: ProjectTask[] = await Promise.all(
      featureTasks.map((t) => this.mapBackendTaskToProjectTask(t))
    );

    const feature: Feature = {
      id: this.generateId(),
      projectId: this.context.projectId!,
      name: backendTask.name,
      description: backendTask.notes,
      status: backendTask.completed ? 'complete' : 'planned',
      targetDate: backendTask.due_on,
      tasks,
      _backendId: featureId,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    return feature;
  }

  /**
   * Update a feature.
   */
  async updateFeature(featureId: string, updates: Partial<Feature>): Promise<Feature> {
    const backendUpdates: any = {};

    if (updates.name) backendUpdates.name = updates.name;
    if (updates.description) backendUpdates.notes = updates.description;
    if (updates.targetDate) backendUpdates.due_on = this.formatDate(updates.targetDate);
    if (updates.status === 'complete') backendUpdates.completed = true;

    await this.backend.task.updateTask(featureId, backendUpdates);

    return this.getFeature(featureId);
  }

  /**
   * Delete a feature.
   */
  async deleteFeature(featureId: string): Promise<void> {
    await this.backend.task.deleteTask(featureId);
  }

  /**
   * List all features in a project.
   */
  async listFeatures(projectId: string): Promise<Feature[]> {
    const allTasks = await this.backend.task.listTasks();
    const milestones = allTasks.filter((t) => t.is_milestone);

    const features: Feature[] = await Promise.all(
      milestones.map(async (m) => {
        const featureTasks = allTasks.filter((t) =>
          t.tags?.includes(`feature:${m.gid}`)
        );

        return {
          id: this.generateId(),
          projectId,
          name: m.name,
          description: m.notes,
          status: m.completed ? 'complete' : 'planned',
          targetDate: m.due_on,
          tasks: await Promise.all(featureTasks.map((t) => this.mapBackendTaskToProjectTask(t))),
          _backendId: m.gid,
          createdAt: this.now(),
          updatedAt: this.now(),
        };
      })
    );

    return features;
  }

  // =========================================================================
  // Task Operations
  // =========================================================================

  /**
   * Create a new task.
   */
  async createTask(input: CreateProjectTaskInput): Promise<ProjectTask> {
    const { projectId, featureId, name, description, stage, dueDate, assignee, tags } = input;

    const backendTask = await this.backend.task.createTask(
      name,
      description,
      this.formatDate(dueDate)
    );

    // Add to section if stage specified
    if (stage) {
      await this.moveTaskToStage(backendTask.gid, stage);
    }

    // Link to feature via tag
    const taskTags = ['level:task', ...(tags || [])];
    if (featureId) {
      taskTags.push(`feature:${featureId}`);
    }

    await this.addMetadataTags(backendTask.gid, taskTags);

    return this.mapBackendTaskToProjectTask(backendTask);
  }

  /**
   * Get a task by ID.
   */
  async getTask(taskId: string): Promise<ProjectTask> {
    const backendTask = await this.backend.task.getTask(taskId);
    return this.mapBackendTaskToProjectTask(backendTask);
  }

  /**
   * Update a task.
   */
  async updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask> {
    const backendUpdates: any = {};

    if (updates.name) backendUpdates.name = updates.name;
    if (updates.description) backendUpdates.notes = updates.description;
    if (updates.dueDate) backendUpdates.due_on = this.formatDate(updates.dueDate);
    if (updates.completed !== undefined) backendUpdates.completed = updates.completed;

    await this.backend.task.updateTask(taskId, backendUpdates);

    if (updates.stage) {
      await this.moveTaskToStage(taskId, updates.stage);
    }

    return this.getTask(taskId);
  }

  /**
   * Delete a task.
   */
  async deleteTask(taskId: string): Promise<void> {
    await this.backend.task.deleteTask(taskId);
  }

  /**
   * List all tasks in a project.
   */
  async listTasks(projectId: string): Promise<ProjectTask[]> {
    const allTasks = await this.backend.task.listTasks();
    const nonMilestones = allTasks.filter((t) => !t.is_milestone);

    return Promise.all(nonMilestones.map((t) => this.mapBackendTaskToProjectTask(t)));
  }

  /**
   * Move a task to a different stage (section).
   */
  async moveTaskToStage(taskId: string, stage: ProjectStage): Promise<ProjectTask> {
    // Get section by name
    const sections = await this.backend.section.listSections(this.context.projectId!);
    const targetSection = sections.find((s) => s.name.toLowerCase() === stage.toLowerCase());

    if (targetSection) {
      await this.backend.section.addTaskToSection(taskId, targetSection.gid);
    } else if (this.config?.autoCreate) {
      // Create section and add task
      const newSection = await this.backend.section.createSection(this.context.projectId!, stage);
      await this.backend.section.addTaskToSection(taskId, newSection.gid);
    }

    return this.getTask(taskId);
  }

  // =========================================================================
  // Subtask Operations
  // =========================================================================

  /**
   * Create a new subtask.
   */
  async createSubtask(input: CreateProjectSubtaskInput): Promise<ProjectSubtask> {
    const { taskId, name, assignee } = input;

    const backendSubtask = await this.backend.subtask.createSubtask(taskId, name);

    const subtask: ProjectSubtask = {
      id: this.generateId(),
      taskId,
      name: backendSubtask.name,
      completed: backendSubtask.completed || false,
      assignee,
      _backendId: backendSubtask.gid,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    return subtask;
  }

  /**
   * Update a subtask.
   */
  async updateSubtask(subtaskId: string, updates: Partial<ProjectSubtask>): Promise<ProjectSubtask> {
    const backendUpdates: any = {};

    if (updates.name) backendUpdates.name = updates.name;
    if (updates.completed !== undefined) backendUpdates.completed = updates.completed;

    const updatedTask = await this.backend.task.updateTask(subtaskId, backendUpdates);

    const subtask: ProjectSubtask = {
      id: this.generateId(),
      taskId: '', // Would need to get from backend
      name: updatedTask.name,
      completed: updatedTask.completed,
      _backendId: subtaskId,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    return subtask;
  }

  /**
   * Delete a subtask.
   */
  async deleteSubtask(subtaskId: string): Promise<void> {
    await this.backend.task.deleteTask(subtaskId);
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Map backend task to ProjectTask.
   */
  private async mapBackendTaskToProjectTask(backendTask: Task): Promise<ProjectTask> {
    // Get subtasks
    const subtasksData = await this.backend.subtask.listSubtasks(backendTask.gid);
    const subtasks: ProjectSubtask[] = subtasksData.map((s) => ({
      id: this.generateId(),
      taskId: backendTask.gid,
      name: s.name,
      completed: s.completed || false,
      _backendId: s.gid,
      createdAt: this.now(),
      updatedAt: this.now(),
    }));

    // Extract feature ID from tags
    const featureTag = backendTask.tags?.find((t) => t.startsWith('feature:'));
    const featureId = featureTag?.split(':')[1];

    const task: ProjectTask = {
      id: this.generateId(),
      projectId: this.context.projectId!,
      featureId,
      name: backendTask.name,
      description: backendTask.notes,
      completed: backendTask.completed,
      stage: backendTask.section as ProjectStage,
      dueDate: backendTask.due_on,
      assignee: backendTask.assignee,
      tags: backendTask.tags,
      subtasks,
      _backendId: backendTask.gid,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    return task;
  }
}
