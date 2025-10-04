import { Project, ProjectBrief, ProjectMembership } from './types';

/**
 * Interface for project backend implementations.
 *
 * Handles project-level operations including CRUD, project briefs
 * (knowledge articles), and project membership management.
 */
export interface IProjectBackend {
  /**
   * Gets project information.
   *
   * Args:
   *   projectGid: The project GID.
   *
   * Returns:
   *   The Project object.
   */
  getProject(projectGid: string): Promise<Project>;

  /**
   * Lists all projects in the workspace.
   *
   * Returns:
   *   Array of Project objects.
   */
  listProjects(): Promise<Project[]>;

  /**
   * Creates a new project.
   *
   * Args:
   *   name: Project name.
   *   notes: Optional project description.
   *   color: Optional project color.
   *
   * Returns:
   *   The created Project object.
   */
  createProject(name: string, notes?: string, color?: string): Promise<Project>;

  /**
   * Gets a project brief.
   *
   * Args:
   *   projectGid: The project GID.
   *
   * Returns:
   *   The ProjectBrief object.
   */
  getProjectBrief(projectGid: string): Promise<ProjectBrief>;

  /**
   * Creates a project brief.
   *
   * Args:
   *   projectGid: The project GID.
   *   title: Brief title.
   *   text: Optional brief text content.
   *
   * Returns:
   *   The created ProjectBrief object.
   */
  createProjectBrief(projectGid: string, title: string, text?: string): Promise<ProjectBrief>;

  /**
   * Updates a project brief.
   *
   * Args:
   *   briefGid: The project brief GID.
   *   title: Optional new title.
   *   text: Optional new text content.
   *
   * Returns:
   *   The updated ProjectBrief object.
   */
  updateProjectBrief(briefGid: string, title?: string, text?: string): Promise<ProjectBrief>;

  /**
   * Deletes a project brief.
   *
   * Args:
   *   briefGid: The project brief GID to delete.
   */
  deleteProjectBrief(briefGid: string): Promise<void>;

  /**
   * Lists project members.
   *
   * Args:
   *   projectGid: The project GID.
   *
   * Returns:
   *   Array of ProjectMembership objects.
   */
  listProjectMembers(projectGid: string): Promise<ProjectMembership[]>;

  /**
   * Adds a user to a project.
   *
   * Args:
   *   projectGid: The project GID.
   *   userGid: The user GID to add.
   *
   * Returns:
   *   The created ProjectMembership object.
   */
  addProjectMember(projectGid: string, userGid: string): Promise<ProjectMembership>;

  /**
   * Removes a user from a project.
   *
   * Args:
   *   projectGid: The project GID.
   *   userGid: The user GID to remove.
   */
  removeProjectMember(projectGid: string, userGid: string): Promise<void>;
}
