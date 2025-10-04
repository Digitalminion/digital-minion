/**
 * Represents an available workspace in the task management system.
 */
export interface Workspace {
  /** Global identifier for the workspace. */
  gid: string;

  /** Human-readable workspace name. */
  name: string;
}

/**
 * Represents a team within a workspace.
 */
export interface Team {
  /** Global identifier for the team. */
  gid: string;

  /** Human-readable team name. */
  name: string;

  /** Description of the team (optional). */
  description?: string;
}

/**
 * Represents a project within a team.
 */
export interface ProjectSummary {
  /** Global identifier for the project. */
  gid: string;

  /** Human-readable project name. */
  name: string;

  /** Whether the project is archived (optional). */
  archived?: boolean;
}

/**
 * Configuration data for a specific backend.
 */
export interface BackendConfig {
  /** Access token or credentials for authentication. */
  accessToken: string;

  /** Current workspace identifier. */
  workspaceId: string;

  /** Current workspace name. */
  workspaceName: string;

  /** Current team identifier. */
  teamId: string;

  /** Current team name. */
  teamName: string;

  /** Current project identifier. */
  projectId: string;

  /** Current project name. */
  projectName: string;

  /** Additional backend-specific configuration (optional). */
  [key: string]: any;
}

/**
 * Interface for configuration backend implementations.
 *
 * Defines operations for authentication, validation, and discovery of
 * workspaces, teams, and projects. Implementations handle initialization
 * and configuration management for different task management systems.
 *
 * This interface provides the configuration layer that sits above the
 * task management operations, handling setup and context switching.
 */
export interface IConfigBackend {
  /**
   * Validates the provided access token or credentials.
   *
   * Args:
   *   accessToken: The access token or credentials to validate.
   *
   * Returns:
   *   True if the token is valid and can authenticate, false otherwise.
   */
  validateToken(accessToken: string): Promise<boolean>;

  /**
   * Retrieves all workspaces accessible with the current credentials.
   *
   * Args:
   *   accessToken: The access token for authentication.
   *
   * Returns:
   *   Array of Workspace objects.
   */
  getWorkspaces(accessToken: string): Promise<Workspace[]>;

  /**
   * Retrieves all teams within a specific workspace.
   *
   * Args:
   *   accessToken: The access token for authentication.
   *   workspaceId: The workspace GID to fetch teams from.
   *
   * Returns:
   *   Array of Team objects.
   */
  getTeams(accessToken: string, workspaceId: string): Promise<Team[]>;

  /**
   * Retrieves all projects within a specific team.
   *
   * Args:
   *   accessToken: The access token for authentication.
   *   teamId: The team GID to fetch projects from.
   *
   * Returns:
   *   Array of ProjectSummary objects.
   */
  getProjects(accessToken: string, teamId: string): Promise<ProjectSummary[]>;

  /**
   * Tests the connection to the backend service.
   *
   * Args:
   *   config: The backend configuration to test.
   *
   * Returns:
   *   True if the connection is successful, false otherwise.
   */
  testConnection(config: BackendConfig): Promise<boolean>;

  /**
   * Creates a new team within a workspace (if supported).
   *
   * Args:
   *   accessToken: The access token for authentication.
   *   workspaceId: The workspace GID to create the team in.
   *   name: The team name.
   *   description: Optional team description.
   *
   * Returns:
   *   The created Team object.
   *
   * Note: May not be supported by all backends.
   */
  createTeam?(accessToken: string, workspaceId: string, name: string, description?: string): Promise<Team>;

  /**
   * Creates a new project within a team (if supported).
   *
   * Args:
   *   accessToken: The access token for authentication.
   *   teamId: The team GID to create the project in.
   *   name: The project name.
   *   notes: Optional project description.
   *
   * Returns:
   *   The created ProjectSummary object.
   *
   * Note: May not be supported by all backends.
   */
  createProject?(accessToken: string, teamId: string, name: string, notes?: string): Promise<ProjectSummary>;
}
