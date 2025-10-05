import { Task } from './types';

/**
 * Represents a task template.
 */
export interface TaskTemplate {
  /** Global identifier for the template. */
  gid: string;

  /** Template name. */
  name: string;

  /** Template description. */
  notes?: string;

  /** Default tags for tasks created from this template. */
  tags?: string[];

  /** Default section for tasks created from this template. */
  section?: string;

  /** Default priority for tasks created from this template. */
  priority?: 'low' | 'medium' | 'high';

  /** Whether tasks from this template should be milestones. */
  isMilestone?: boolean;

  /** Subtask templates (nested structure). */
  subtasks?: Array<{
    name: string;
    notes?: string;
  }>;
}

/**
 * Interface for template backend implementations.
 *
 * Provides operations for managing task templates - reusable
 * structures that can quickly create tasks with predefined
 * configurations.
 */
export interface ITemplateBackend {
  /**
   * Lists all templates in the project.
   *
   * Returns:
   *   Array of TaskTemplate objects.
   */
  listTemplates(): Promise<TaskTemplate[]>;

  /**
   * Retrieves a specific template by ID.
   *
   * Args:
   *   templateId: The template GID to fetch.
   *
   * Returns:
   *   The requested TaskTemplate object.
   */
  getTemplate(templateId: string): Promise<TaskTemplate>;

  /**
   * Creates a task from a template.
   *
   * Args:
   *   templateId: The template GID to use.
   *   taskName: Optional custom name (overrides template name).
   *   sectionId: Optional section to place the task in.
   *
   * Returns:
   *   The created Task object.
   */
  createTaskFromTemplate(templateId: string, taskName?: string, sectionId?: string): Promise<Task>;

  /**
   * Creates a new template.
   *
   * Args:
   *   name: Template name.
   *   notes: Optional template description.
   *   tags: Optional default tags.
   *   priority: Optional default priority.
   *   isMilestone: Optional milestone flag.
   *
   * Returns:
   *   The created TaskTemplate object.
   */
  createTemplate(
    name: string,
    notes?: string,
    tags?: string[],
    priority?: string,
    isMilestone?: boolean
  ): Promise<TaskTemplate>;

  /**
   * Deletes a template.
   *
   * Args:
   *   templateId: The template GID to delete.
   */
  deleteTemplate(templateId: string): Promise<void>;
}
