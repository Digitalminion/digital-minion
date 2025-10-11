import { v4 as uuidv4 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data/dist/storage/jsonl.storage';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { IUserBackend } from '../core/user-backend';
import { User } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';

/**
 * Local file-based implementation of the IUserBackend interface.
 *
 * Manages users in the local workspace. For local backend, this provides
 * a simple user management system with a default local user.
 */
export class LocalUserBackend extends LocalBackendBase implements IUserBackend {
  private storage: JsonlRowStorage<User>;
  private usersFile: string;
  private initialized: boolean = false;
  private currentUserGid: string = 'local-user';

  constructor(config: LocalConfig) {
    super(config);

    this.storage = new JsonlRowStorage<User>();
    this.usersFile = path.join(
      this.basePath,
      this.projectId,
      'users.jsonl'
    );
  }

  /**
   * Ensures the storage is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const dir = path.dirname(this.usersFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create default user if it doesn't exist
      const users = await this.listUsers();
      if (!users.find(u => u.gid === this.currentUserGid)) {
        const defaultUser: User = {
          gid: this.currentUserGid,
          name: os.userInfo().username || 'Local User',
          email: `${os.userInfo().username}@local`,
        };
        await this.storage.appendRows(this.usersFile, [defaultUser]);
      }

      this.initialized = true;
    }
  }

  async getCurrentUser(): Promise<User> {
    await this.ensureInitialized();

    try {
      const users = await this.listUsers();
      const currentUser = users.find(u => u.gid === this.currentUserGid);

      if (!currentUser) {
        throw new Error('Current user not found');
      }

      return currentUser;
    } catch (error) {
      throw new Error(`Failed to get current user: ${error}`);
    }
  }

  async getUser(userGid: string): Promise<User> {
    await this.ensureInitialized();

    try {
      const users = await this.listUsers();
      const user = users.find(u => u.gid === userGid);

      if (!user) {
        throw new Error(`User with ID ${userGid} not found`);
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  }

  async listUsers(): Promise<User[]> {
    await this.ensureInitialized();

    try {
      if (!fs.existsSync(this.usersFile)) {
        return [];
      }
      return await this.storage.readAll(this.usersFile);
    } catch (error) {
      throw new Error(`Failed to list users: ${error}`);
    }
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();

    try {
      const users = await this.listUsers();
      return users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error}`);
    }
  }
}
