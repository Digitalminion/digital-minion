const Asana = require('asana');
import { ICommentBackend } from '../core/comment-backend';
import { Comment } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the ICommentBackend interface.
 *
 * Provides comment/story management functionality using the Asana API,
 * including creating comments and listing comments on tasks.
 */
export class AsanaCommentBackend extends AsanaBackendBase implements ICommentBackend {
  private storiesApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.storiesApi = new Asana.StoriesApi();
  }

  async listComments(taskId: string): Promise<Comment[]> {
    try {
      const result = await this.storiesApi.getStoriesForTask(taskId, {
        opt_fields: 'gid,text,created_by.name,created_at,resource_subtype',
      });

      // Filter to only comment stories (not system-generated stories)
      return result.data
        .filter((story: any) => story.resource_subtype === 'comment_added')
        .map((story: any) => ({
          gid: story.gid,
          text: story.text || '',
          createdBy: story.created_by?.name || undefined,
          createdAt: story.created_at || undefined,
        }));
    } catch (error) {
      throw new Error(`Failed to list comments: ${error}`);
    }
  }

  async createComment(taskId: string, text: string): Promise<Comment> {
    try {
      const result = await this.storiesApi.createStoryForTask(
        { data: { text } },
        taskId,
        {
          opt_fields: 'gid,text,created_by.name,created_at',
        }
      );

      const story = result.data;
      return {
        gid: story.gid,
        text: story.text || '',
        createdBy: story.created_by?.name || undefined,
        createdAt: story.created_at || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create comment: ${error}`);
    }
  }
}
