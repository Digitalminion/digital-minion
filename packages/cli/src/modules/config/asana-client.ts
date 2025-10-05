const Asana = require('asana');

/**
 * Represents an Asana workspace.
 */
export interface AsanaWorkspace {
  /** Global identifier for the workspace. */
  gid: string;

  /** Human-readable workspace name. */
  name: string;
}

/**
 * Represents an Asana team within a workspace.
 */
export interface AsanaTeam {
  /** Global identifier for the team. */
  gid: string;

  /** Human-readable team name. */
  name: string;
}

/**
 * Represents an Asana project within a team.
 */
export interface AsanaProject {
  /** Global identifier for the project. */
  gid: string;

  /** Human-readable project name. */
  name: string;
}

/**
 * Client for interacting with Asana's API during initialization.
 *
 * Provides methods for authenticating with Asana and fetching workspace,
 * team, and project information needed for configuration setup.
 */
export class AsanaClient {
  private workspacesApi: any;
  private teamsApi: any;
  private projectsApi: any;
  private usersApi: any;

  /**
   * Creates a new AsanaClient instance.
   *
   * Initializes the Asana API client with authentication and sets up API
   * instances for workspaces, teams, projects, and users.
   *
   * Args:
   *   accessToken: Personal access token for Asana API authentication.
   */
  constructor(accessToken: string) {
    const client = Asana.ApiClient.instance;
    const token = client.authentications['token'];
    token.accessToken = accessToken;

    this.workspacesApi = new Asana.WorkspacesApi();
    this.teamsApi = new Asana.TeamsApi();
    this.projectsApi = new Asana.ProjectsApi();
    this.usersApi = new Asana.UsersApi();
  }

  /**
   * Retrieves all workspaces accessible with the current access token.
   *
   * Returns:
   *   Array of workspace objects containing GID and name.
   *
   * Raises:
   *   Error: If the API request fails.
   */
  async getWorkspaces(): Promise<AsanaWorkspace[]> {
    try {
      const result = await this.workspacesApi.getWorkspaces();
      return result.data.map((ws: any) => ({
        gid: ws.gid,
        name: ws.name,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch workspaces: ${error}`);
    }
  }

  /**
   * Retrieves all teams within a specific workspace.
   *
   * Args:
   *   workspaceId: The GID of the workspace to fetch teams from.
   *
   * Returns:
   *   Array of team objects containing GID and name.
   *
   * Raises:
   *   Error: If the API request fails.
   */
  async getTeams(workspaceId: string): Promise<AsanaTeam[]> {
    try {
      const result = await this.teamsApi.getTeamsForWorkspace(workspaceId);
      return result.data.map((team: any) => ({
        gid: team.gid,
        name: team.name,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch teams: ${error}`);
    }
  }

  /**
   * Retrieves all projects within a specific team.
   *
   * Args:
   *   teamId: The GID of the team to fetch projects from.
   *
   * Returns:
   *   Array of project objects containing GID and name.
   *
   * Raises:
   *   Error: If the API request fails.
   */
  async getProjects(teamId: string): Promise<AsanaProject[]> {
    try {
      const result = await this.projectsApi.getProjectsForTeam(teamId);
      return result.data.map((project: any) => ({
        gid: project.gid,
        name: project.name,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error}`);
    }
  }

  /**
   * Validates the access token by attempting to fetch current user information.
   *
   * Returns:
   *   True if token is valid and API call succeeds, false otherwise.
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.usersApi.getUser('me');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates a new team in a workspace.
   *
   * Args:
   *   workspaceId: The GID of the workspace to create the team in.
   *   teamName: The name for the new team.
   *
   * Returns:
   *   The created team object containing GID and name.
   *
   * Raises:
   *   Error: If the API request fails.
   */
  async createTeam(workspaceId: string, teamName: string): Promise<AsanaTeam> {
    try {
      const result = await this.teamsApi.createTeam({
        data: {
          name: teamName,
          organization: workspaceId,
        },
      });
      return {
        gid: result.data.gid,
        name: result.data.name,
      };
    } catch (error) {
      throw new Error(`Failed to create team: ${error}`);
    }
  }

  /**
   * Creates a new project in a workspace or team.
   *
   * Args:
   *   workspaceId: The GID of the workspace to create the project in.
   *   projectName: The name for the new project.
   *   teamId: Optional team GID to associate the project with.
   *
   * Returns:
   *   The created project object containing GID and name.
   *
   * Raises:
   *   Error: If the API request fails.
   */
  async createProject(workspaceId: string, projectName: string, teamId?: string): Promise<AsanaProject> {
    try {
      const projectData: any = {
        name: projectName,
        workspace: workspaceId,
      };

      if (teamId) {
        projectData.team = teamId;
      }

      const result = await this.projectsApi.createProject({
        data: projectData,
      });

      return {
        gid: result.data.gid,
        name: result.data.name,
      };
    } catch (error) {
      throw new Error(`Failed to create project: ${error}`);
    }
  }
}
