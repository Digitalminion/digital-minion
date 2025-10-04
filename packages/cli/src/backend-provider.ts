import { Backends } from '@digital-minion/lib';
import { ConfigManager } from './config/manager';

/**
 * Backend provider utility for CLI modules.
 *
 * Provides a centralized way to get backend instances with proper
 * configuration from the config manager.
 */
export class BackendProvider {
  private static instance: BackendProvider;
  private backends?: Backends.AllBackends;
  private config?: Backends.MinionConfig;

  private constructor() {}

  /**
   * Gets the singleton instance of BackendProvider.
   */
  static getInstance(): BackendProvider {
    if (!BackendProvider.instance) {
      BackendProvider.instance = new BackendProvider();
    }
    return BackendProvider.instance;
  }

  /**
   * Loads configuration and initializes backends.
   */
  private loadConfig(): Backends.MinionConfig {
    if (this.config) {
      return this.config;
    }

    const configManager = new ConfigManager();
    const config = configManager.load();

    if (!config) {
      console.error('✗ No configuration found. Please run "dm config init" first.');
      process.exit(1);
    }

    if (config.backend === 'asana') {
      if (!config.asana) {
        console.error('✗ Asana configuration not found. Please run "dm config init" again.');
        process.exit(1);
      }
      this.config = {
        backend: 'asana',
        config: config.asana
      };
    } else {
      console.error('✗ Local backend not yet implemented.');
      process.exit(1);
    }

    return this.config;
  }

  /**
   * Gets all backends, creating them if needed.
   */
  getAllBackends(): Backends.AllBackends {
    if (this.backends) {
      return this.backends;
    }

    const config = this.loadConfig();
    this.backends = Backends.BackendFactory.createAllBackends(config);
    return this.backends;
  }

  /**
   * Gets a specific backend by name.
   */
  getTaskBackend() {
    return this.getAllBackends().task;
  }

  getTagBackend() {
    return this.getAllBackends().tag;
  }

  getSectionBackend() {
    return this.getAllBackends().section;
  }

  getSubtaskBackend() {
    return this.getAllBackends().subtask;
  }

  getCommentBackend() {
    return this.getAllBackends().comment;
  }

  getAttachmentBackend() {
    return this.getAllBackends().attachment;
  }

  getDependencyBackend() {
    return this.getAllBackends().dependency;
  }

  getWorkflowBackend() {
    return this.getAllBackends().workflow;
  }

  getStatusBackend() {
    return this.getAllBackends().status;
  }

  getProjectBackend() {
    return this.getAllBackends().project;
  }

  getUserBackend() {
    return this.getAllBackends().user;
  }

  getBatchBackend() {
    return this.getAllBackends().batch;
  }

  getExportBackend() {
    return this.getAllBackends().export;
  }

  getListBackend() {
    return this.getAllBackends().list;
  }

  /**
   * Resets the provider (useful for testing or config changes).
   */
  reset() {
    this.backends = undefined;
    this.config = undefined;
  }
}
