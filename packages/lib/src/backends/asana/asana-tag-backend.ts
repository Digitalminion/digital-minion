const Asana = require('asana');
import { ITagBackend } from '../core/tag-backend';
import { Tag } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the ITagBackend interface.
 *
 * Provides tag management functionality using the Asana API,
 * including creating tags, listing tags, and managing tag-task relationships.
 */
export class AsanaTagBackend extends AsanaBackendBase implements ITagBackend {
  private tagsApi: any;
  private tasksApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tagsApi = new Asana.TagsApi();
    this.tasksApi = new Asana.TasksApi();
  }

  async listTags(): Promise<Tag[]> {
    try {
      const result = await this.tagsApi.getTagsForWorkspace(this.workspaceId);
      return result.data.map((tag: any) => ({
        gid: tag.gid,
        name: tag.name,
      }));
    } catch (error) {
      throw new Error(`Failed to list tags: ${error}`);
    }
  }

  async createTag(name: string): Promise<Tag> {
    try {
      const result = await this.tagsApi.createTag({
        data: {
          name,
          workspace: this.workspaceId,
        },
      });

      return {
        gid: result.data.gid,
        name: result.data.name,
      };
    } catch (error) {
      throw new Error(`Failed to create tag: ${error}`);
    }
  }

  async addTagToTask(taskId: string, tagId: string): Promise<void> {
    try {
      await this.tasksApi.addTagForTask({
        data: {
          tag: tagId,
        },
      }, taskId);
    } catch (error) {
      throw new Error(`Failed to add tag to task: ${error}`);
    }
  }

  async removeTagFromTask(taskId: string, tagId: string): Promise<void> {
    try {
      await this.tasksApi.removeTagForTask({
        data: {
          tag: tagId,
        },
      }, taskId);
    } catch (error) {
      throw new Error(`Failed to remove tag from task: ${error}`);
    }
  }
}
