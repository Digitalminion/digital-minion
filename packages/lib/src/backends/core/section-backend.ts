import { Section } from './types';

/**
 * Interface for section backend implementations.
 *
 * Handles section management within projects, allowing tasks to be
 * organized into logical groupings.
 */
export interface ISectionBackend {
  /**
   * Lists all sections in the project.
   *
   * Returns:
   *   Array of Section objects.
   */
  listSections(): Promise<Section[]>;

  /**
   * Creates a new section in the project.
   *
   * Args:
   *   name: Section name.
   *
   * Returns:
   *   The created Section object.
   */
  createSection(name: string): Promise<Section>;

  /**
   * Moves a task to a different section.
   *
   * Args:
   *   taskId: The task GID to move.
   *   sectionId: The target section GID.
   */
  moveTaskToSection(taskId: string, sectionId: string): Promise<void>;
}
