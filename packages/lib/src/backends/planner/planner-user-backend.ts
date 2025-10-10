import { IUserBackend } from '../core/user-backend';
import { User } from '../core/types';
import { PlannerConfig, PlannerBackendBase } from './planner-config';

/**
 * Represents a user from the Graph API
 */
interface GraphUser {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
}

/**
 * Microsoft Planner-based implementation of the IUserBackend interface.
 *
 * Uses Microsoft Graph to get user information from the group members.
 */
export class PlannerUserBackend extends PlannerBackendBase implements IUserBackend {
  constructor(config: PlannerConfig) {
    super(config);
  }

  async listUsers(): Promise<User[]> {
    try {
      const result = await this.graphClient.get<{ value: GraphUser[] }>(
        `/groups/${this.groupId}/members`,
        {
          select: ['id', 'displayName', 'mail', 'userPrincipalName'],
        }
      );

      return result.value.map((graphUser) => ({
        gid: graphUser.id,
        name: graphUser.displayName,
        email: graphUser.mail || graphUser.userPrincipalName,
      }));
    } catch (error) {
      throw new Error(`Failed to list users: ${error}`);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const graphUser = await this.graphClient.get<GraphUser>('/me', {
        select: ['id', 'displayName', 'mail', 'userPrincipalName'],
      });

      return {
        gid: graphUser.id,
        name: graphUser.displayName,
        email: graphUser.mail || graphUser.userPrincipalName,
      };
    } catch (error) {
      throw new Error(`Failed to get current user: ${error}`);
    }
  }

  /**
   * Get a specific user by ID
   *
   * Extension method - not in core interface but useful
   *
   * @param userId - The user ID
   * @returns The user object
   */
  async getUser(userId: string): Promise<User> {
    try {
      const graphUser = await this.graphClient.get<GraphUser>(`/users/${userId}`, {
        select: ['id', 'displayName', 'mail', 'userPrincipalName'],
      });

      return {
        gid: graphUser.id,
        name: graphUser.displayName,
        email: graphUser.mail || graphUser.userPrincipalName,
      };
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  }

  /**
   * Search for users by name or email
   *
   * Extension method - useful for finding users to assign
   *
   * @param query - Search query
   * @returns Matching users
   */
  async findUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await this.graphClient.get<{ value: GraphUser[] }>(
        `/users`,
        {
          select: ['id', 'displayName', 'mail', 'userPrincipalName'],
          filter: `mail eq '${email}' or userPrincipalName eq '${email}'`,
        }
      );

      if (result.value.length === 0) {
        return undefined;
      }

      const graphUser = result.value[0];
      return {
        gid: graphUser.id,
        name: graphUser.displayName,
        email: graphUser.mail || graphUser.userPrincipalName,
      };
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error}`);
    }
  }

  /**
   * Search for users by name or email
   *
   * Extension method - useful for finding users to assign
   *
   * @param query - Search query
   * @returns Matching users
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const result = await this.graphClient.get<{ value: GraphUser[] }>(
        `/users`,
        {
          select: ['id', 'displayName', 'mail', 'userPrincipalName'],
          filter: `startswith(displayName,'${query}') or startswith(mail,'${query}')`,
        }
      );

      return result.value.map((graphUser) => ({
        gid: graphUser.id,
        name: graphUser.displayName,
        email: graphUser.mail || graphUser.userPrincipalName,
      }));
    } catch (error) {
      throw new Error(`Failed to search users: ${error}`);
    }
  }
}
