const Asana = require('asana');
import { IAttachmentBackend } from '../core/attachment-backend';
import { Attachment } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Asana-based implementation of the IAttachmentBackend interface.
 *
 * Provides attachment management functionality using the Asana API,
 * handling file uploads, URL attachments, and attachment lifecycle.
 */
export class AsanaAttachmentBackend extends AsanaBackendBase implements IAttachmentBackend {
  private attachmentsApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.attachmentsApi = new Asana.AttachmentsApi();
  }

  async listAttachments(taskId: string): Promise<Attachment[]> {
    try {
      const result = await this.attachmentsApi.getAttachmentsForTask(taskId, {
        opt_fields: 'gid,name,resource_type,download_url,permanent_url,host,size,created_at,parent.gid',
      });

      return result.data.map((att: any) => ({
        gid: att.gid,
        name: att.name || '',
        resourceType: att.resource_type || undefined,
        downloadUrl: att.download_url || undefined,
        permanentUrl: att.permanent_url || undefined,
        host: att.host || undefined,
        size: att.size || undefined,
        createdAt: att.created_at || undefined,
        parent: att.parent?.gid || undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to list attachments: ${error}`);
    }
  }

  async attachUrl(taskId: string, url: string, name?: string): Promise<Attachment> {
    try {
      const result = await this.attachmentsApi.createAttachmentForTask(
        { data: { url, name: name || url } },
        taskId,
        {
          opt_fields: 'gid,name,resource_type,download_url,permanent_url,host,size,created_at,parent.gid',
        }
      );

      const att = result.data;
      return {
        gid: att.gid,
        name: att.name || '',
        resourceType: att.resource_type || undefined,
        downloadUrl: att.download_url || undefined,
        permanentUrl: att.permanent_url || undefined,
        host: att.host || undefined,
        size: att.size || undefined,
        createdAt: att.created_at || undefined,
        parent: att.parent?.gid || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to attach URL: ${error}`);
    }
  }

  async attachFile(taskId: string, filePath: string, name?: string): Promise<Attachment> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileName = name || path.basename(filePath);
      const fileStream = fs.createReadStream(filePath);

      const result = await this.attachmentsApi.createAttachmentForTask(
        { data: { file: fileStream, name: fileName } },
        taskId,
        {
          opt_fields: 'gid,name,resource_type,download_url,permanent_url,host,size,created_at,parent.gid',
        }
      );

      const att = result.data;
      return {
        gid: att.gid,
        name: att.name || '',
        resourceType: att.resource_type || undefined,
        downloadUrl: att.download_url || undefined,
        permanentUrl: att.permanent_url || undefined,
        host: att.host || undefined,
        size: att.size || undefined,
        createdAt: att.created_at || undefined,
        parent: att.parent?.gid || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to attach file: ${error}`);
    }
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      await this.attachmentsApi.deleteAttachment(attachmentId);
    } catch (error) {
      throw new Error(`Failed to delete attachment: ${error}`);
    }
  }
}
