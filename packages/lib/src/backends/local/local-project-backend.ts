import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { IProjectBackend } from '../core/project-backend';
import { Project, ProjectBrief, ProjectMembership } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';

/**
 * Local file-based implementation of the IProjectBackend interface.
 *
 * Manages projects, project briefs (knowledge articles), and project
 * memberships using local JSONL files.
 */
export class LocalProjectBackend extends LocalBackendBase implements IProjectBackend {
  private projectStorage: JsonlRowStorage<Project>;
  private briefStorage: JsonlRowStorage<ProjectBrief>;
  private membershipStorage: JsonlRowStorage<ProjectMembership>;
  private projectsFile: string;
  private briefsFile: string;
  private membershipsFile: string;
  private initialized: boolean = false;

  constructor(config: LocalConfig) {
    super(config);

    this.projectStorage = new JsonlRowStorage<Project>();
    this.briefStorage = new JsonlRowStorage<ProjectBrief>();
    this.membershipStorage = new JsonlRowStorage<ProjectMembership>();

    this.projectsFile = path.join(
      this.basePath,
      this.projectId,
      'projects.jsonl'
    );
    this.briefsFile = path.join(
      this.basePath,
      this.projectId,
      'project-briefs.jsonl'
    );
    this.membershipsFile = path.join(
      this.basePath,
      this.projectId,
      'project-memberships.jsonl'
    );
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.projectsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async listProjects(): Promise<Project[]> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.projectsFile)) {
        return [];
      }
      return await this.projectStorage.readAll(this.projectsFile);
    } catch (error) {
      throw new Error(`Failed to list projects: ${error}`);
    }
  }

  async getProject(projectGid: string): Promise<Project> {
    await this.ensureInitialized();

    try {
      const projects = await this.listProjects();
      const project = projects.find(p => p.gid === projectGid);

      if (!project) {
        throw new Error(`Project with ID ${projectGid} not found`);
      }

      return project;
    } catch (error) {
      throw new Error(`Failed to get project: ${error}`);
    }
  }

  async createProject(name: string, notes?: string, color?: string): Promise<Project> {
    await this.ensureInitialized();

    try {
      const project: Project = {
        gid: uuidv4(),
        name,
        notes,
        color,
        archived: false,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      await this.projectStorage.appendRows(this.projectsFile, [project]);

      return project;
    } catch (error) {
      throw new Error(`Failed to create project: ${error}`);
    }
  }

  async getProjectBrief(projectGid: string): Promise<ProjectBrief> {
    await this.ensureInitialized();

    try {
      // Verify project exists
      await this.getProject(projectGid);

      if (!fs.existsSync(this.briefsFile)) {
        throw new Error(`No project brief found for project ${projectGid}`);
      }

      const briefs = await this.briefStorage.readAll(this.briefsFile);
      const brief = briefs.find(b => b.project === projectGid);

      if (!brief) {
        throw new Error(`No project brief found for project ${projectGid}`);
      }

      return brief;
    } catch (error) {
      throw new Error(`Failed to get project brief: ${error}`);
    }
  }

  async createProjectBrief(projectGid: string, title: string, text?: string): Promise<ProjectBrief> {
    await this.ensureInitialized();

    try {
      // Verify project exists
      await this.getProject(projectGid);

      const brief: ProjectBrief = {
        gid: uuidv4(),
        project: projectGid,
        title,
        text,
      };

      await this.briefStorage.appendRows(this.briefsFile, [brief]);

      return brief;
    } catch (error) {
      throw new Error(`Failed to create project brief: ${error}`);
    }
  }

  async updateProjectBrief(briefGid: string, title?: string, text?: string): Promise<ProjectBrief> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.briefsFile)) {
        throw new Error(`Project brief with ID ${briefGid} not found`);
      }

      const briefs = await this.briefStorage.readAll(this.briefsFile);
      const briefIndex = briefs.findIndex(b => b.gid === briefGid);

      if (briefIndex === -1) {
        throw new Error(`Project brief with ID ${briefGid} not found`);
      }

      // Apply updates
      if (title !== undefined) {
        briefs[briefIndex].title = title;
      }
      if (text !== undefined) {
        briefs[briefIndex].text = text;
      }

      await this.briefStorage.writeAll(this.briefsFile, briefs);

      return briefs[briefIndex];
    } catch (error) {
      throw new Error(`Failed to update project brief: ${error}`);
    }
  }

  async deleteProjectBrief(briefGid: string): Promise<void> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.briefsFile)) {
        throw new Error(`Project brief with ID ${briefGid} not found`);
      }

      const briefs = await this.briefStorage.readAll(this.briefsFile);
      const filteredBriefs = briefs.filter(b => b.gid !== briefGid);

      if (filteredBriefs.length === briefs.length) {
        throw new Error(`Project brief with ID ${briefGid} not found`);
      }

      await this.briefStorage.writeAll(this.briefsFile, filteredBriefs);
    } catch (error) {
      throw new Error(`Failed to delete project brief: ${error}`);
    }
  }

  async listProjectMembers(projectGid: string): Promise<ProjectMembership[]> {
    await this.ensureInitialized();

    try {
      // Verify project exists
      await this.getProject(projectGid);

      if (!fs.existsSync(this.membershipsFile)) {
        return [];
      }

      const memberships = await this.membershipStorage.readAll(this.membershipsFile);
      return memberships.filter(m => m.project === projectGid);
    } catch (error) {
      throw new Error(`Failed to list project members: ${error}`);
    }
  }

  async addProjectMember(projectGid: string, userGid: string): Promise<ProjectMembership> {
    await this.ensureInitialized();

    try {
      // Verify project exists
      await this.getProject(projectGid);

      // Check if membership already exists
      const existingMembers = await this.listProjectMembers(projectGid);
      const existing = existingMembers.find(m => m.user === userGid);

      if (existing) {
        return existing;
      }

      const membership: ProjectMembership = {
        gid: uuidv4(),
        project: projectGid,
        user: userGid,
      };

      await this.membershipStorage.appendRows(this.membershipsFile, [membership]);

      return membership;
    } catch (error) {
      throw new Error(`Failed to add project member: ${error}`);
    }
  }

  async removeProjectMember(projectGid: string, userGid: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Verify project exists
      await this.getProject(projectGid);

      if (!fs.existsSync(this.membershipsFile)) {
        throw new Error(`Membership not found`);
      }

      const memberships = await this.membershipStorage.readAll(this.membershipsFile);
      const filteredMemberships = memberships.filter(
        m => !(m.project === projectGid && m.user === userGid)
      );

      if (filteredMemberships.length === memberships.length) {
        throw new Error(`Membership not found`);
      }

      await this.membershipStorage.writeAll(this.membershipsFile, filteredMemberships);
    } catch (error) {
      throw new Error(`Failed to remove project member: ${error}`);
    }
  }
}
