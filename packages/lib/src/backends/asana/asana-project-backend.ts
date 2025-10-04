const Asana = require('asana');
import { IProjectBackend } from '../core/project-backend';
import { Project, ProjectBrief, ProjectMembership } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the IProjectBackend interface.
 *
 * Provides project management functionality using the Asana API as the backend
 * storage system. Handles all operations for projects, project briefs,
 * and project membership management.
 */
export class AsanaProjectBackend extends AsanaBackendBase implements IProjectBackend {
  private projectsApi: any;
  private projectBriefsApi: any;
  private projectMembershipsApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.projectsApi = new Asana.ProjectsApi();
    this.projectBriefsApi = new Asana.ProjectBriefsApi();
    this.projectMembershipsApi = new Asana.ProjectMembershipsApi();
  }

  async getProject(projectGid: string): Promise<Project> {
    try {
      const result = await this.projectsApi.getProject(projectGid, {
        opt_fields: 'gid,name,notes,archived,color,owner.name,workspace.gid,team.gid,current_status,due_on,start_on,created_at,modified_at,permalink_url',
      });

      const proj = result.data;
      return {
        gid: proj.gid,
        name: proj.name,
        notes: proj.notes || undefined,
        archived: proj.archived || false,
        color: proj.color || undefined,
        owner: proj.owner?.name || undefined,
        workspace: proj.workspace?.gid || undefined,
        team: proj.team?.gid || undefined,
        currentStatus: proj.current_status || undefined,
        dueOn: proj.due_on || undefined,
        startOn: proj.start_on || undefined,
        createdAt: proj.created_at || undefined,
        modifiedAt: proj.modified_at || undefined,
        permalinkUrl: proj.permalink_url || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get project: ${error}`);
    }
  }

  async listProjects(): Promise<Project[]> {
    try {
      const result = await this.projectsApi.getProjects({
        workspace: this.workspaceId,
        opt_fields: 'gid,name,notes,archived,color,owner.name,current_status,due_on,start_on,created_at,modified_at',
      });

      return result.data.map((proj: any) => ({
        gid: proj.gid,
        name: proj.name,
        notes: proj.notes || undefined,
        archived: proj.archived || false,
        color: proj.color || undefined,
        owner: proj.owner?.name || undefined,
        currentStatus: proj.current_status || undefined,
        dueOn: proj.due_on || undefined,
        startOn: proj.start_on || undefined,
        createdAt: proj.created_at || undefined,
        modifiedAt: proj.modified_at || undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to list projects: ${error}`);
    }
  }

  async createProject(name: string, notes?: string, color?: string): Promise<Project> {
    try {
      const data: any = {
        name,
        workspace: this.workspaceId,
      };

      if (notes) data.notes = notes;
      if (color) data.color = color;

      const result = await this.projectsApi.createProject(
        { data },
        {
          opt_fields: 'gid,name,notes,archived,color,owner.name,workspace.gid,created_at,permalink_url',
        }
      );

      const proj = result.data;
      return {
        gid: proj.gid,
        name: proj.name,
        notes: proj.notes || undefined,
        archived: proj.archived || false,
        color: proj.color || undefined,
        owner: proj.owner?.name || undefined,
        workspace: proj.workspace?.gid || undefined,
        createdAt: proj.created_at || undefined,
        permalinkUrl: proj.permalink_url || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create project: ${error}`);
    }
  }

  async getProjectBrief(projectGid: string): Promise<ProjectBrief> {
    try {
      const result = await this.projectBriefsApi.getProjectBrief(projectGid, {
        opt_fields: 'gid,title,text,html_text,permalink_url,project.gid',
      });

      const brief = result.data;
      return {
        gid: brief.gid,
        title: brief.title || undefined,
        text: brief.text || undefined,
        htmlText: brief.html_text || undefined,
        permalinkUrl: brief.permalink_url || undefined,
        project: brief.project?.gid || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get project brief: ${error}`);
    }
  }

  async createProjectBrief(projectGid: string, title: string, text?: string): Promise<ProjectBrief> {
    try {
      // Use direct HTTP API since the SDK method has issues
      const briefData: any = {};
      if (title) briefData.title = title;
      // Project briefs require HTML wrapped in <body> tags
      if (text) {
        // Wrap plain text in body tags, escaping HTML characters
        const escapedText = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        briefData.html_text = `<body>${escapedText}</body>`;
      }

      const response = await fetch(`https://app.asana.com/api/1.0/projects/${projectGid}/project_briefs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: briefData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: any = await response.json();
      const brief = result.data;

      return {
        gid: brief.gid,
        title: brief.title || undefined,
        text: brief.text || undefined,
        htmlText: brief.html_text || undefined,
        permalinkUrl: brief.permalink_url || undefined,
        project: brief.project?.gid || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create project brief: ${error}`);
    }
  }

  async updateProjectBrief(briefGid: string, title?: string, text?: string): Promise<ProjectBrief> {
    try {
      const data: any = {};
      if (title !== undefined) data.title = title;
      if (text !== undefined) data.text = text;

      if (Object.keys(data).length === 0) {
        throw new Error('No updates specified');
      }

      const result = await this.projectBriefsApi.updateProjectBrief(
        { data },
        briefGid,
        {
          opt_fields: 'gid,title,text,html_text,permalink_url,project.gid',
        }
      );

      const brief = result.data;
      return {
        gid: brief.gid,
        title: brief.title || undefined,
        text: brief.text || undefined,
        htmlText: brief.html_text || undefined,
        permalinkUrl: brief.permalink_url || undefined,
        project: brief.project?.gid || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to update project brief: ${error}`);
    }
  }

  async deleteProjectBrief(briefGid: string): Promise<void> {
    try {
      await this.projectBriefsApi.deleteProjectBrief(briefGid);
    } catch (error) {
      throw new Error(`Failed to delete project brief: ${error}`);
    }
  }

  async listProjectMembers(projectGid: string): Promise<ProjectMembership[]> {
    try {
      const result = await this.projectMembershipsApi.getProjectMembershipsForProject(projectGid, {
        opt_fields: 'gid,user.gid,user.name,project.gid,access_level',
      });

      return result.data.map((membership: any) => ({
        gid: membership.gid,
        user: membership.user?.gid || undefined,
        userName: membership.user?.name || undefined,
        project: membership.project?.gid || undefined,
        accessLevel: membership.access_level || undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to list project members: ${error}`);
    }
  }

  async addProjectMember(projectGid: string, userGid: string): Promise<ProjectMembership> {
    try {
      // Use the direct API approach since membership creation has specific requirements
      const response = await fetch(`https://app.asana.com/api/1.0/projects/${projectGid}/addMembers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { members: userGid } }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Return a basic membership object
      return {
        gid: 'created',
        user: userGid,
        project: projectGid,
      };
    } catch (error) {
      throw new Error(`Failed to add project member: ${error}`);
    }
  }

  async removeProjectMember(projectGid: string, userGid: string): Promise<void> {
    try {
      const response = await fetch(`https://app.asana.com/api/1.0/projects/${projectGid}/removeMembers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { members: userGid } }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      throw new Error(`Failed to remove project member: ${error}`);
    }
  }
}
