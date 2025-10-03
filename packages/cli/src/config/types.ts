/**
 * Supported backend types for task storage.
 */
export type BackendType = 'local' | 'asana';

/**
 * Configuration for Asana backend integration.
 *
 * Contains all necessary credentials and workspace identifiers for connecting
 * to Asana's API and managing tasks within a specific project.
 */
export interface AsanaConfig {
  /** Personal access token for Asana API authentication. */
  accessToken: string;

  /** Global identifier for the Asana workspace. */
  workspaceId: string;

  /** Human-readable name of the workspace. */
  workspaceName: string;

  /** Global identifier for the team within the workspace. */
  teamId: string;

  /** Human-readable name of the team. */
  teamName: string;

  /** Global identifier for the project within the team. */
  projectId: string;

  /** Human-readable name of the project. */
  projectName: string;
}

/**
 * Main configuration structure for the CLI application.
 *
 * Stores the selected backend type and backend-specific configuration.
 * Currently supports local storage (not implemented) and Asana integration.
 */
export interface MinionConfig {
  /** Type of backend to use for task storage. */
  backend: BackendType;

  /** Asana-specific configuration (required when backend is 'asana'). */
  asana?: AsanaConfig;
}
