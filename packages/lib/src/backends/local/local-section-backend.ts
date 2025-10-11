import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { ISectionBackend } from '../core/section-backend';
import { Section } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the ISectionBackend interface.
 *
 * Manages sections for organizing tasks within a project.
 * Sections are stored in a separate JSONL file, and task-section
 * relationships are tracked in the task's memberships array.
 */
export class LocalSectionBackend extends LocalBackendBase implements ISectionBackend {
  private storage: JsonlRowStorage<Section>;
  private sectionsFile: string;
  private taskBackend: LocalTaskBackend;
  private initialized: boolean = false;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);

    this.storage = new JsonlRowStorage<Section>();
    this.sectionsFile = path.join(
      this.basePath,
      this.projectId,
      'sections.jsonl'
    );

    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.sectionsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async listSections(): Promise<Section[]> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.sectionsFile)) {
        return [];
      }
      return await this.storage.readAll(this.sectionsFile);
    } catch (error) {
      throw new Error(`Failed to list sections: ${error}`);
    }
  }

  async createSection(name: string): Promise<Section> {
    await this.ensureInitialized();

    try {
      const section: Section = {
        gid: uuidv4(),
        name,
      };

      await this.storage.appendRows(this.sectionsFile, [section]);

      return section;
    } catch (error) {
      throw new Error(`Failed to create section: ${error}`);
    }
  }

  async moveTaskToSection(taskId: string, sectionId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Verify section exists
      const sections = await this.listSections();
      const section = sections.find(s => s.gid === sectionId);

      if (!section) {
        throw new Error(`Section with ID ${sectionId} not found`);
      }

      // Update task's memberships
      const task = await this.taskBackend.getTask(taskId);

      // Update or create memberships array with the new section
      const memberships = [
        {
          section: {
            gid: section.gid,
            name: section.name,
          },
        },
      ];

      await this.taskBackend.updateTask(taskId, { memberships });
    } catch (error) {
      throw new Error(`Failed to move task to section: ${error}`);
    }
  }
}
