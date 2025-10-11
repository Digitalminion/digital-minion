import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import { IStatusBackend } from '../core/status-backend';
import { StatusUpdate } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';

/**
 * Local file-based implementation of the IStatusBackend interface.
 *
 * Manages status updates for projects, allowing teams to communicate
 * project health, progress, and blockers. Simplified for local storage
 * without full Asana-style status management.
 */
export class LocalStatusBackend extends LocalBackendBase implements IStatusBackend {
  private storage: JsonlRowStorage<StatusUpdate>;
  private statusUpdatesFile: string;
  private initialized: boolean = false;

  constructor(config: LocalConfig) {
    super(config);

    this.storage = new JsonlRowStorage<StatusUpdate>();
    this.statusUpdatesFile = path.join(
      this.basePath,
      this.projectId,
      'status-updates.jsonl'
    );
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.statusUpdatesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.initialized = true;
    }
  }

  async createStatusUpdate(
    projectGid: string,
    title: string,
    statusType: string,
    text?: string
  ): Promise<StatusUpdate> {
    await this.ensureInitialized();

    try {
      // Validate status type
      const validTypes = ['on_track', 'at_risk', 'off_track', 'on_hold'];
      if (!validTypes.includes(statusType)) {
        throw new Error(
          `Invalid status type: ${statusType}. Must be one of: ${validTypes.join(', ')}`
        );
      }

      const statusUpdate: StatusUpdate = {
        gid: uuidv4(),
        parent: projectGid,
        title,
        statusType: statusType as 'on_track' | 'at_risk' | 'off_track' | 'on_hold',
        text,
        createdAt: new Date().toISOString(),
      };

      await this.storage.appendRows(this.statusUpdatesFile, [statusUpdate]);

      return statusUpdate;
    } catch (error) {
      throw new Error(`Failed to create status update: ${error}`);
    }
  }

  async listStatusUpdates(projectGid: string): Promise<StatusUpdate[]> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.statusUpdatesFile)) {
        return [];
      }

      const allUpdates = await this.storage.readAll(this.statusUpdatesFile);
      return allUpdates.filter(update => update.parent === projectGid);
    } catch (error) {
      throw new Error(`Failed to list status updates: ${error}`);
    }
  }

  async getStatusUpdate(statusUpdateGid: string): Promise<StatusUpdate> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.statusUpdatesFile)) {
        throw new Error(`Status update with ID ${statusUpdateGid} not found`);
      }

      const updates = await this.storage.readAll(this.statusUpdatesFile);
      const update = updates.find(u => u.gid === statusUpdateGid);

      if (!update) {
        throw new Error(`Status update with ID ${statusUpdateGid} not found`);
      }

      return update;
    } catch (error) {
      throw new Error(`Failed to get status update: ${error}`);
    }
  }

  async deleteStatusUpdate(statusUpdateGid: string): Promise<void> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.statusUpdatesFile)) {
        throw new Error(`Status update with ID ${statusUpdateGid} not found`);
      }

      const updates = await this.storage.readAll(this.statusUpdatesFile);
      const filteredUpdates = updates.filter(u => u.gid !== statusUpdateGid);

      if (filteredUpdates.length === updates.length) {
        throw new Error(`Status update with ID ${statusUpdateGid} not found`);
      }

      await this.storage.writeAll(this.statusUpdatesFile, filteredUpdates);
    } catch (error) {
      throw new Error(`Failed to delete status update: ${error}`);
    }
  }
}
