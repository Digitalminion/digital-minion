import { Backends } from '@digital-minion/lib';
import { ConfigManager } from './config/manager';
import { BackendConfiguration } from './config/types';

/**
 * Backend provider utility for CLI modules.
 *
 * Provides a centralized way to get backend instances with proper
 * configuration from the config manager. Supports multiple named backends
 * with a default selection and CLI flag override.
 */
export class BackendProvider {
  private static instance: BackendProvider;
  private backendsCache: Map<string, Backends.AllBackends> = new Map();
  private configManager: ConfigManager;
  private currentBackendName?: string;

  private constructor() {
    this.configManager = new ConfigManager();
  }

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
   * Sets the backend to use for this session (e.g., from CLI flag).
   *
   * Args:
   *   backendName: Name of the backend to use. If undefined, uses the default.
   */
  setCurrentBackend(backendName?: string): void {
    this.currentBackendName = backendName;
  }

  /**
   * Gets the name of the backend to use (either overridden or default).
   *
   * Returns:
   *   Backend name to use.
   */
  private getCurrentBackendName(): string {
    if (this.currentBackendName) {
      return this.currentBackendName;
    }

    const defaultBackend = this.configManager.getDefaultBackendName();
    if (!defaultBackend) {
      console.error('✗ No configuration found. Please run "dm config init" first.');
      process.exit(1);
    }

    return defaultBackend;
  }

  /**
   * Converts CLI backend configuration to lib MinionConfig format.
   *
   * Args:
   *   backendConfig: Backend configuration from CLI config.
   *
   * Returns:
   *   MinionConfig in the format expected by the lib.
   */
  private convertToLibConfig(backendConfig: BackendConfiguration): Backends.MinionConfig {
    if (backendConfig.type === 'asana') {
      if (!backendConfig.asana) {
        console.error('✗ Asana configuration not found. Please run "dm config backend add" again.');
        process.exit(1);
      }
      return {
        backend: 'asana',
        config: backendConfig.asana,
      };
    } else if (backendConfig.type === 'local') {
      if (!backendConfig.local) {
        console.error('✗ Local configuration not found. Please run "dm config backend add" again.');
        process.exit(1);
      }
      return {
        backend: 'local',
        config: backendConfig.local,
      };
    } else {
      console.error(`✗ Unsupported backend type: ${backendConfig.type}`);
      process.exit(1);
    }
  }

  /**
   * Gets all backends for the current backend selection, creating them if needed.
   *
   * Returns:
   *   All backend instances for the selected backend.
   */
  getAllBackends(): Backends.AllBackends {
    const backendName = this.getCurrentBackendName();

    // Check cache
    const cached = this.backendsCache.get(backendName);
    if (cached) {
      return cached;
    }

    // Load backend config
    const backendConfig = this.configManager.getBackend(backendName);
    if (!backendConfig) {
      console.error(`✗ Backend '${backendName}' not found in configuration.`);
      process.exit(1);
    }

    // Convert to lib format and create backends
    const libConfig = this.convertToLibConfig(backendConfig);
    const backends = Backends.BackendFactory.createAllBackends(libConfig);

    // Cache for reuse
    this.backendsCache.set(backendName, backends);

    return backends;
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

  getTemplateBackend() {
    return this.getAllBackends().template;
  }

  getTimeTrackingBackend() {
    return this.getAllBackends().timeTracking;
  }

  /**
   * Resets the provider (useful for testing or config changes).
   */
  reset() {
    this.backendsCache.clear();
    this.currentBackendName = undefined;
  }
}
