const Asana = require('asana');
import { IConfigBackend, Workspace, Team, ProjectSummary, BackendConfig } from '../core/config-backend';

/**
 * Asana implementation of the IConfigBackend interface.
 *
 * Provides configuration and initialization operations for Asana,
 * including token validation and workspace/team/project discovery.
 */
export class AsanaConfigBackend implements IConfigBackend {
  private workspacesApi: any;
  private teamsApi: any;
  private projectsApi: any;
  private usersApi: any;

  constructor(accessToken: string) {
    const client = Asana.ApiClient.instance;
    const token = client.authentications['token'];
    token.accessToken = accessToken;

    this.workspacesApi = new Asana.WorkspacesApi();
    this.teamsApi = new Asana.TeamsApi();
    this.projectsApi = new Asana.ProjectsApi();
    this.usersApi = new Asana.UsersApi();
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      // Create temporary client with provided token
      const Asana = require('asana');
      const client = Asana.ApiClient.instance;
      const token = client.authentications['token'];
      token.accessToken = accessToken;

      const usersApi = new Asana.UsersApi();
      await usersApi.getUser('me');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getWorkspaces(accessToken: string): Promise<Workspace[]> {
    try {
      // Create temporary client with provided token
      const Asana = require('asana');
      const client = Asana.ApiClient.instance;
      const token = client.authentications['token'];
      token.accessToken = accessToken;

      const workspacesApi = new Asana.WorkspacesApi();
      const result = await workspacesApi.getWorkspaces();

      return result.data.map((ws: any) => ({
        gid: ws.gid,
        name: ws.name,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch workspaces: ${error}`);
    }
  }

  async getTeams(accessToken: string, workspaceId: string): Promise<Team[]> {
    try {
      // Create temporary client with provided token
      const Asana = require('asana');
      const client = Asana.ApiClient.instance;
      const token = client.authentications['token'];
      token.accessToken = accessToken;

      const teamsApi = new Asana.TeamsApi();
      const result = await teamsApi.getTeamsForWorkspace(workspaceId);

      return result.data.map((team: any) => ({
        gid: team.gid,
        name: team.name,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch teams: ${error}`);
    }
  }

  async getProjects(accessToken: string, teamId: string): Promise<ProjectSummary[]> {
    try {
      // Create temporary client with provided token
      const Asana = require('asana');
      const client = Asana.ApiClient.instance;
      const token = client.authentications['token'];
      token.accessToken = accessToken;

      const projectsApi = new Asana.ProjectsApi();
      const result = await projectsApi.getProjectsForTeam(teamId);

      return result.data.map((project: any) => ({
        gid: project.gid,
        name: project.name,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error}`);
    }
  }

  async testConnection(config: BackendConfig): Promise<boolean> {
    try {
      const Asana = require('asana');
      const client = Asana.ApiClient.instance;
      const token = client.authentications['token'];
      token.accessToken = config.accessToken;

      const projectsApi = new Asana.ProjectsApi();
      await projectsApi.getProject(config.projectId);
      return true;
    } catch (error) {
      return false;
    }
  }
}
