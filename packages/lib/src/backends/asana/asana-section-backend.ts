const Asana = require('asana');
import { ISectionBackend } from '../core/section-backend';
import { Section } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the ISectionBackend interface.
 *
 * Provides section management functionality using the Asana API,
 * including creating sections, listing sections, and moving tasks between sections.
 */
export class AsanaSectionBackend extends AsanaBackendBase implements ISectionBackend {
  private sectionsApi: any;
  private tasksApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.sectionsApi = new Asana.SectionsApi();
    this.tasksApi = new Asana.TasksApi();
  }

  async listSections(): Promise<Section[]> {
    try {
      const result = await this.sectionsApi.getSectionsForProject(this.projectId);
      return result.data.map((section: any) => ({
        gid: section.gid,
        name: section.name,
      }));
    } catch (error) {
      throw new Error(`Failed to list sections: ${error}`);
    }
  }

  async createSection(name: string): Promise<Section> {
    try {
      // Use direct REST API call since the Node.js library doesn't have this method
      const response = await fetch(`https://app.asana.com/api/1.0/projects/${this.projectId}/sections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { name } }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: any = await response.json();
      return {
        gid: result.data.gid,
        name: result.data.name,
      };
    } catch (error) {
      throw new Error(`Failed to create section: ${error}`);
    }
  }

  async moveTaskToSection(taskId: string, sectionId: string): Promise<void> {
    try {
      // Use the tasks API to add the task to the section
      await this.tasksApi.addProjectForTask(
        { data: { project: this.projectId, section: sectionId } },
        taskId
      );
    } catch (error) {
      throw new Error(`Failed to move task to section: ${error}`);
    }
  }
}
