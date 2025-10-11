import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { IAttachmentBackend } from '../core/attachment-backend';
import { Attachment } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the IAttachmentBackend interface.
 *
 * Manages attachments on tasks. For local backend, this primarily handles
 * URL attachments and file path references. Files are not uploaded to a
 * remote server but tracked with local paths.
 */
export class LocalAttachmentBackend extends LocalBackendBase implements IAttachmentBackend {
  private storage: JsonlRowStorage<Attachment & { taskId: string }>;
  private attachmentsFile: string;
  private attachmentsDir: string;
  private taskBackend: LocalTaskBackend;
  private initialized: boolean = false;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);

    this.storage = new JsonlRowStorage<Attachment & { taskId: string }>();
    this.attachmentsFile = path.join(
      this.basePath,
      this.projectId,
      'attachments.jsonl'
    );
    this.attachmentsDir = path.join(
      this.basePath,
      this.projectId,
      'attachments'
    );

    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.attachmentsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.attachmentsDir)) {
        fs.mkdirSync(this.attachmentsDir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async listAttachments(taskId: string): Promise<Attachment[]> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      const task = await this.taskBackend.getTask(taskId);

      if (!fs.existsSync(this.attachmentsFile)) {
        return [];
      }

      const allAttachments = await this.storage.readAll(this.attachmentsFile);
      return allAttachments
        .filter(a => a.taskId === taskId)
        .map(({ taskId, ...attachment }) => attachment);
    } catch (error) {
      throw new Error(`Failed to list attachments: ${error}`);
    }
  }

  async attachUrl(taskId: string, url: string, name?: string): Promise<Attachment> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      const task = await this.taskBackend.getTask(taskId);

      const attachment: Attachment & { taskId: string } = {
        gid: uuidv4(),
        name: name || url,
        taskId,
        parent: taskId,
        resourceType: 'external',
        host: 'external',
        permanentUrl: url,
        createdAt: new Date().toISOString(),
      };

      await this.storage.appendRows(this.attachmentsFile, [attachment]);

      // Update task's numAttachments count
      const currentAttachments = await this.listAttachments(taskId);
      await this.taskBackend.updateTask(taskId, {
        numAttachments: currentAttachments.length,
      });

      const { taskId: _, ...result } = attachment;
      return result;
    } catch (error) {
      throw new Error(`Failed to attach URL: ${error}`);
    }
  }

  async attachFile(taskId: string, filePath: string, name?: string): Promise<Attachment> {
    await this.ensureInitialized();

    try {
      // Verify task exists
      await this.taskBackend.getTask(taskId);

      // Verify source file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileName = name || path.basename(filePath);

      // Copy file to attachments directory
      const destPath = path.join(this.attachmentsDir, `${uuidv4()}_${fileName}`);
      fs.copyFileSync(filePath, destPath);

      const attachment: Attachment & { taskId: string } = {
        gid: uuidv4(),
        name: fileName,
        taskId,
        parent: taskId,
        resourceType: 'file',
        host: 'local',
        downloadUrl: destPath,
        permanentUrl: destPath,
        size: stats.size,
        createdAt: new Date().toISOString(),
      };

      await this.storage.appendRows(this.attachmentsFile, [attachment]);

      // Update task's numAttachments count
      const currentAttachments = await this.listAttachments(taskId);
      await this.taskBackend.updateTask(taskId, {
        numAttachments: currentAttachments.length,
      });

      const { taskId: _, ...result } = attachment;
      return result;
    } catch (error) {
      throw new Error(`Failed to attach file: ${error}`);
    }
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.attachmentsFile)) {
        throw new Error(`Attachment with ID ${attachmentId} not found`);
      }

      const allAttachments = await this.storage.readAll(this.attachmentsFile);
      const attachment = allAttachments.find(a => a.gid === attachmentId);

      if (!attachment) {
        throw new Error(`Attachment with ID ${attachmentId} not found`);
      }

      // Delete the file if it's a local file
      if (attachment.resourceType === 'file' && attachment.downloadUrl) {
        if (fs.existsSync(attachment.downloadUrl)) {
          fs.unlinkSync(attachment.downloadUrl);
        }
      }

      // Remove from storage
      const filtered = allAttachments.filter(a => a.gid !== attachmentId);
      await this.storage.writeAll(this.attachmentsFile, filtered);

      // Update task's numAttachments count
      const taskId = attachment.taskId;
      const currentAttachments = await this.listAttachments(taskId);
      await this.taskBackend.updateTask(taskId, {
        numAttachments: currentAttachments.length,
      });
    } catch (error) {
      throw new Error(`Failed to delete attachment: ${error}`);
    }
  }
}
