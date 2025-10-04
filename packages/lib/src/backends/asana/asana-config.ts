/**
 * Asana-specific configuration interface.
 *
 * Contains all the settings required to connect to and interact with
 * the Asana API for a specific workspace, team, and project.
 */
export interface AsanaConfig {
  /** Asana Personal Access Token for authentication. */
  accessToken: string;

  /** The workspace GID to operate within. */
  workspaceId: string;

  /** The team GID to operate within. */
  teamId: string;

  /** The project GID to operate within. */
  projectId: string;
}

/**
 * Base class for all Asana backend implementations.
 *
 * Provides shared Asana client initialization and configuration
 * that all domain backends can extend from.
 */
export class AsanaBackendBase {
  protected client: any;
  protected accessToken: string;
  protected workspaceId: string;
  protected teamId: string;
  protected projectId: string;

  constructor(config: AsanaConfig) {
    // Initialize Asana client
    const Asana = require('asana');
    const client = Asana.ApiClient.instance;
    const token = client.authentications['token'];
    token.accessToken = config.accessToken;

    this.client = client;
    this.accessToken = config.accessToken;
    this.workspaceId = config.workspaceId;
    this.teamId = config.teamId;
    this.projectId = config.projectId;
  }
}
