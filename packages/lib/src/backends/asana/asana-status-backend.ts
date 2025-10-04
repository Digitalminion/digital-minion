const Asana = require('asana');
import { IStatusBackend } from '../core/status-backend';
import { StatusUpdate } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the IStatusBackend interface.
 *
 * Provides project status update management functionality using the Asana API,
 * handling status updates to communicate project health, progress, and blockers.
 */
export class AsanaStatusBackend extends AsanaBackendBase implements IStatusBackend {
  private statusUpdatesApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.statusUpdatesApi = new Asana.StatusUpdatesApi();
  }

  async createStatusUpdate(projectGid: string, title: string, statusType: string, text?: string): Promise<StatusUpdate> {
    try {
      const data: any = {
        title,
        status_type: statusType,
        parent: projectGid,
      };

      if (text) {
        data.text = text;
      }

      const result = await this.statusUpdatesApi.createStatusForObject(
        { data },
        projectGid,
        {
          opt_fields: 'gid,title,text,html_text,status_type,author.name,created_at,parent.gid',
        }
      );

      const update = result.data;
      return {
        gid: update.gid,
        title: update.title || '',
        text: update.text || undefined,
        htmlText: update.html_text || undefined,
        statusType: update.status_type,
        author: update.author?.name || undefined,
        createdAt: update.created_at || undefined,
        parent: update.parent?.gid || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create status update: ${error}`);
    }
  }

  async listStatusUpdates(projectGid: string): Promise<StatusUpdate[]> {
    try {
      const result = await this.statusUpdatesApi.getStatusesForObject(projectGid, {
        opt_fields: 'gid,title,text,html_text,status_type,author.name,created_at,parent.gid',
      });

      return result.data.map((update: any) => ({
        gid: update.gid,
        title: update.title || '',
        text: update.text || undefined,
        htmlText: update.html_text || undefined,
        statusType: update.status_type,
        author: update.author?.name || undefined,
        createdAt: update.created_at || undefined,
        parent: update.parent?.gid || undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to list status updates: ${error}`);
    }
  }

  async getStatusUpdate(statusUpdateGid: string): Promise<StatusUpdate> {
    try {
      const result = await this.statusUpdatesApi.getStatus(statusUpdateGid, {
        opt_fields: 'gid,title,text,html_text,status_type,author.name,created_at,parent.gid',
      });

      const update = result.data;
      return {
        gid: update.gid,
        title: update.title || '',
        text: update.text || undefined,
        htmlText: update.html_text || undefined,
        statusType: update.status_type,
        author: update.author?.name || undefined,
        createdAt: update.created_at || undefined,
        parent: update.parent?.gid || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get status update: ${error}`);
    }
  }

  async deleteStatusUpdate(statusUpdateGid: string): Promise<void> {
    try {
      await this.statusUpdatesApi.deleteStatus(statusUpdateGid);
    } catch (error) {
      throw new Error(`Failed to delete status update: ${error}`);
    }
  }
}
