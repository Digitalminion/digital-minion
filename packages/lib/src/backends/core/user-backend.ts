import { User } from './types';

/**
 * Interface for user backend implementations.
 *
 * Handles user-related operations including fetching user information,
 * listing workspace users, and searching for users.
 */
export interface IUserBackend {
  /**
   * Gets the current authenticated user.
   *
   * Returns:
   *   The User object for the authenticated user.
   */
  getCurrentUser(): Promise<User>;

  /**
   * Gets a specific user by GID.
   *
   * Args:
   *   userGid: The user GID.
   *
   * Returns:
   *   The User object.
   */
  getUser(userGid: string): Promise<User>;

  /**
   * Lists all users in the workspace.
   *
   * Returns:
   *   Array of User objects.
   */
  listUsers(): Promise<User[]>;

  /**
   * Searches for a user by email address.
   *
   * Args:
   *   email: The email address to search for.
   *
   * Returns:
   *   The User object if found, undefined otherwise.
   */
  findUserByEmail(email: string): Promise<User | undefined>;
}
