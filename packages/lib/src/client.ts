/**
 * Asana client wrapper for Digital Minion
 */

import * as asana from 'asana';
import { Task, TaskFilter } from './types';

/**
 * Digital Minion client for interacting with Asana
 */
export class DigitalMinionClient {
  private client: asana.Client;

  constructor(accessToken: string) {
    this.client = asana.Client.create().useAccessToken(accessToken);
  }

  /**
   * Get the underlying Asana client
   */
  getAsanaClient(): asana.Client {
    return this.client;
  }

  /**
   * Placeholder for future task query methods
   */
  async getTasks(filter: TaskFilter): Promise<Task[]> {
    // TODO: Implement task querying logic
    throw new Error('Not implemented');
  }
}
