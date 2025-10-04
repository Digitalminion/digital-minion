const Asana = require('asana');
import { IUserBackend } from '../core/user-backend';
import { User } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the IUserBackend interface.
 *
 * Provides user management functionality using the Asana API as the backend
 * storage system. Handles all operations for fetching user information,
 * listing workspace users, and searching for users.
 */
export class AsanaUserBackend extends AsanaBackendBase implements IUserBackend {
  private usersApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.usersApi = new Asana.UsersApi();
  }

  async getCurrentUser(): Promise<User> {
    try {
      const result = await this.usersApi.getUser('me', {
        opt_fields: 'gid,name,email,photo,workspaces.gid,workspaces.name',
      });
      const user = result.data;
      return {
        gid: user.gid,
        name: user.name,
        email: user.email || undefined,
        photo: user.photo?.image_128x128 || undefined,
        workspaces: user.workspaces?.map((w: any) => ({
          gid: w.gid,
          name: w.name,
        })) || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get current user: ${error}`);
    }
  }

  async getUser(userGid: string): Promise<User> {
    try {
      const result = await this.usersApi.getUser(userGid, {
        opt_fields: 'gid,name,email,photo,workspaces.gid,workspaces.name',
      });
      const user = result.data;
      return {
        gid: user.gid,
        name: user.name,
        email: user.email || undefined,
        photo: user.photo?.image_128x128 || undefined,
        workspaces: user.workspaces?.map((w: any) => ({
          gid: w.gid,
          name: w.name,
        })) || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  }

  async listUsers(): Promise<User[]> {
    try {
      const result = await this.usersApi.getUsersForWorkspace(this.workspaceId, {
        opt_fields: 'gid,name,email,photo',
      });
      return result.data.map((user: any) => ({
        gid: user.gid,
        name: user.name,
        email: user.email || undefined,
        photo: user.photo?.image_128x128 || undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to list users: ${error}`);
    }
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    try {
      const users = await this.listUsers();
      return users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error}`);
    }
  }
}
