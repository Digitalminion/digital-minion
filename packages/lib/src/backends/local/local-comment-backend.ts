import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { ICommentBackend } from '../core/comment-backend';
import { Comment } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the ICommentBackend interface.
 *
 * Manages comments on tasks. Comments are stored in a separate JSONL file
 * with references to their parent task.
 */
export class LocalCommentBackend extends LocalBackendBase implements ICommentBackend {
  private storage: JsonlRowStorage<Comment & { taskId: string }>;
  private commentsFile: string;
  private taskBackend: LocalTaskBackend;
  private initialized: boolean = false;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);

    this.storage = new JsonlRowStorage<Comment & { taskId: string }>();
    this.commentsFile = path.join(
      this.basePath,
      this.projectId,
      'comments.jsonl'
    );

    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.commentsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async listComments(taskId: string): Promise<Comment[]> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      await this.taskBackend.getTask(taskId);

      if (!fs.existsSync(this.commentsFile)) {
        return [];
      }

      const allComments = await this.storage.readAll(this.commentsFile);
      return allComments
        .filter(c => c.taskId === taskId)
        .map(({ taskId, ...comment }) => comment);
    } catch (error) {
      throw new Error(`Failed to list comments: ${error}`);
    }
  }

  async createComment(taskId: string, text: string): Promise<Comment> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      await this.taskBackend.getTask(taskId);

      const comment: Comment & { taskId: string } = {
        gid: uuidv4(),
        text,
        taskId,
        createdAt: new Date().toISOString(),
        createdBy: 'local-user',
      };

      await this.storage.appendRows(this.commentsFile, [comment]);

      // Return without taskId
      const { taskId: _, ...result } = comment;
      return result;
    } catch (error) {
      throw new Error(`Failed to create comment: ${error}`);
    }
  }
}
