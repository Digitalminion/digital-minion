import { IConfigBackend } from '../core/config-backend';
import { LocalConfig } from './local-config';

/**
 * Local configuration backend.
 *
 * Provides configuration management for local file-based backends.
 * Unlike API-based backends (Asana), local backends don't require
 * authentication but do need to validate project configuration.
 */
export class LocalConfigBackend implements IConfigBackend {
  private config?: LocalConfig;

  constructor(config?: LocalConfig) {
    this.config = config;
  }

  /**
   * Validates the local configuration.
   *
   * Checks that required configuration (projectId) is present.
   */
  async validateConfig(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    // Must have a project ID
    if (!this.config.projectId || this.config.projectId.trim() === '') {
      return false;
    }

    return true;
  }

  /**
   * Gets the project ID from the configuration.
   */
  async getProjectId(): Promise<string | undefined> {
    return this.config?.projectId;
  }

  /**
   * Sets the project ID in the configuration.
   */
  async setProjectId(projectId: string): Promise<void> {
    if (!this.config) {
      this.config = { projectId };
    } else {
      this.config.projectId = projectId;
    }
  }

  /**
   * Gets the base path for data storage.
   */
  getBasePath(): string | undefined {
    return this.config?.basePath;
  }

  /**
   * Sets the base path for data storage.
   */
  setBasePath(basePath: string): void {
    if (!this.config) {
      throw new Error('Config must be initialized with projectId first');
    }
    this.config.basePath = basePath;
  }

  /**
   * Gets the full configuration.
   */
  getConfig(): LocalConfig | undefined {
    return this.config;
  }
}
