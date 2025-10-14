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
 * Secret credentials for Asana backend.
 * Stored separately from main config for security.
 */
export interface AsanaSecrets {
  /** Personal access token for Asana API authentication. */
  accessToken: string;
}

/**
 * Secrets structure that maps backend names to their credentials.
 * Stored in a separate secrets.json file that should be gitignored.
 */
export interface Secrets {
  [backendName: string]: {
    asana?: AsanaSecrets;
    // Future: add other backend secret types here
  };
}

/**
 * Configuration for Local backend storage.
 *
 * Contains settings for local file-based task storage.
 * Uses hierarchical structure: basePath/teamName/projectName
 */
export interface LocalConfig {
  /** Base path for local storage files. */
  basePath: string;

  /** Team name for organizing data (top-level directory). */
  teamName: string;

  /** Project name for organizing data (subdirectory under team). */
  projectName: string;

  /** Project identifier for internal references. */
  projectId: string;
}

/**
 * Configuration for a single backend instance.
 *
 * Each backend has a type and type-specific configuration.
 */
export interface BackendConfiguration {
  /** Type of this backend. */
  type: BackendType;

  /** Human-readable description of this backend (optional). */
  description?: string;

  /** Asana-specific configuration (required when type is 'asana'). */
  asana?: AsanaConfig;

  /** Local-specific configuration (required when type is 'local'). */
  local?: LocalConfig;
}

/**
 * Main configuration structure for the CLI application.
 *
 * Supports multiple named backends with a default selection.
 * Backends can be switched using the --backend flag or by changing the default.
 */
export interface MinionConfig {
  /** Name of the default backend to use. */
  defaultBackend: string;

  /** Map of backend names to their configurations. */
  backends: Record<string, BackendConfiguration>;
}

/**
 * Legacy configuration structure (deprecated).
 *
 * Supports single backend configuration for backward compatibility.
 * New configurations should use the multi-backend structure.
 *
 * @deprecated Use MinionConfig with multiple backends instead
 */
export interface LegacyMinionConfig {
  /** Type of backend to use for task storage. */
  backend: BackendType;

  /** Asana-specific configuration (required when backend is 'asana'). */
  asana?: AsanaConfig;
}
