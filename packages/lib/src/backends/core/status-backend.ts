import { StatusUpdate } from './types';

/**
 * Interface for status update backend implementations.
 *
 * Handles project status updates, allowing teams to communicate
 * project health, progress, and blockers.
 */
export interface IStatusBackend {
  /**
   * Creates a status update for a project.
   *
   * Args:
   *   projectGid: The project GID.
   *   title: Status update title.
   *   statusType: Status type (on_track, at_risk, off_track, on_hold).
   *   text: Optional status update text.
   *
   * Returns:
   *   The created StatusUpdate object.
   */
  createStatusUpdate(projectGid: string, title: string, statusType: string, text?: string): Promise<StatusUpdate>;

  /**
   * Lists all status updates for a project.
   *
   * Args:
   *   projectGid: The project GID.
   *
   * Returns:
   *   Array of StatusUpdate objects.
   */
  listStatusUpdates(projectGid: string): Promise<StatusUpdate[]>;

  /**
   * Gets a specific status update.
   *
   * Args:
   *   statusUpdateGid: The status update GID.
   *
   * Returns:
   *   The StatusUpdate object.
   */
  getStatusUpdate(statusUpdateGid: string): Promise<StatusUpdate>;

  /**
   * Deletes a status update.
   *
   * Args:
   *   statusUpdateGid: The status update GID to delete.
   */
  deleteStatusUpdate(statusUpdateGid: string): Promise<void>;
}
