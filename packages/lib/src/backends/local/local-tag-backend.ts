import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { ITagBackend } from '../core/tag-backend';
import { Tag } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the ITagBackend interface.
 *
 * Manages tags and their relationships with tasks. Tags are stored in a
 * separate JSONL file, and tag-task relationships are tracked in the
 * task's tags array.
 */
export class LocalTagBackend extends LocalBackendBase implements ITagBackend {
  private storage: JsonlRowStorage<Tag>;
  private tagsFile: string;
  private taskBackend: LocalTaskBackend;
  private initialized: boolean = false;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);

    this.storage = new JsonlRowStorage<Tag>();
    this.tagsFile = path.join(
      this.basePath,
      this.projectId,
      'tags.jsonl'
    );

    // Use provided task backend or create a new one
    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.tagsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async listTags(): Promise<Tag[]> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.tagsFile)) {
        return [];
      }
      return await this.storage.readAll(this.tagsFile);
    } catch (error) {
      throw new Error(`Failed to list tags: ${error}`);
    }
  }

  async createTag(name: string): Promise<Tag> {
    await this.ensureInitialized();

    try {
      // Check if tag already exists
      const existingTags = await this.listTags();
      const existing = existingTags.find(t => t.name.toLowerCase() === name.toLowerCase());

      if (existing) {
        return existing;
      }

      const tag: Tag = {
        gid: uuidv4(),
        name,
      };

      await this.storage.appendRows(this.tagsFile, [tag]);

      return tag;
    } catch (error) {
      throw new Error(`Failed to create tag: ${error}`);
    }
  }

  async addTagToTask(taskId: string, tagId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Get the tag to verify it exists
      const tags = await this.listTags();
      const tag = tags.find(t => t.gid === tagId);

      if (!tag) {
        throw new Error(`Tag with ID ${tagId} not found`);
      }

      // Get the task
      const task = await this.taskBackend.getTask(taskId);

      // Add tag name to task's tags array if not already present
      const taskTags = task.tags || [];
      if (!taskTags.includes(tag.name)) {
        taskTags.push(tag.name);
        await this.taskBackend.updateTask(taskId, { tags: taskTags });
      }
    } catch (error) {
      throw new Error(`Failed to add tag to task: ${error}`);
    }
  }

  async removeTagFromTask(taskId: string, tagId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Get the tag to get its name
      const tags = await this.listTags();
      const tag = tags.find(t => t.gid === tagId);

      if (!tag) {
        throw new Error(`Tag with ID ${tagId} not found`);
      }

      // Get the task
      const task = await this.taskBackend.getTask(taskId);

      // Remove tag name from task's tags array
      const taskTags = task.tags || [];
      const filteredTags = taskTags.filter(t => t !== tag.name);

      await this.taskBackend.updateTask(taskId, { tags: filteredTags });
    } catch (error) {
      throw new Error(`Failed to remove tag from task: ${error}`);
    }
  }
}
