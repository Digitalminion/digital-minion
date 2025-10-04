import { IConfigBackend } from './core/config-backend';
import { ITaskBackend } from './core/task-backend';
import { ITagBackend } from './core/tag-backend';
import { ISectionBackend } from './core/section-backend';
import { ISubtaskBackend } from './core/subtask-backend';
import { ICommentBackend } from './core/comment-backend';
import { IAttachmentBackend } from './core/attachment-backend';
import { IDependencyBackend } from './core/dependency-backend';
import { IWorkflowBackend } from './core/workflow-backend';
import { IStatusBackend } from './core/status-backend';
import { IProjectBackend } from './core/project-backend';
import { IUserBackend } from './core/user-backend';
import { IBatchBackend } from './core/batch-backend';
import { IExportBackend } from './core/export-backend';
import { IListBackend } from './core/list-backend';

/**
 * Supported backend types for task storage.
 */
export type BackendType = 'local' | 'asana';

/**
 * Configuration for a task management backend.
 */
export interface MinionConfig {
  /** Type of backend to use. */
  backend: BackendType;

  /** Backend-specific configuration. */
  config?: any;
}

/**
 * Collection of all domain backends.
 */
export interface AllBackends {
  config: IConfigBackend;
  task: ITaskBackend;
  tag: ITagBackend;
  section: ISectionBackend;
  subtask: ISubtaskBackend;
  comment: ICommentBackend;
  attachment: IAttachmentBackend;
  dependency: IDependencyBackend;
  workflow: IWorkflowBackend;
  status: IStatusBackend;
  project: IProjectBackend;
  user: IUserBackend;
  batch: IBatchBackend;
  export: IExportBackend;
  list: IListBackend;
}

/**
 * Factory for creating backend instances.
 *
 * Provides factory methods for all 15 domain backends, allowing consumers
 * to instantiate only the backends they need or create all backends at once.
 *
 * Example:
 * ```typescript
 * const config = { backend: 'asana', config: asanaConfig };
 *
 * // Create individual backends
 * const taskBackend = BackendFactory.createTaskBackend(config);
 * const tagBackend = BackendFactory.createTagBackend(config);
 *
 * // Or create all backends at once
 * const backends = BackendFactory.createAllBackends(config);
 * await backends.task.listTasks();
 * ```
 */
export class BackendFactory {
  // ============================================================================
  // Individual Backend Creation Methods
  // ============================================================================

  static createConfigBackend(backendType: BackendType, accessToken?: string): IConfigBackend {
    switch (backendType) {
      case 'asana':
        const { AsanaConfigBackend } = require('./asana');
        if (!accessToken) {
          throw new Error('AsanaConfigBackend requires accessToken parameter');
        }
        return new AsanaConfigBackend(accessToken);
      case 'local':
        throw new Error('Local config backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${backendType}`);
    }
  }

  static createTaskBackend(config: MinionConfig): ITaskBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaTaskBackend } = require('./asana');
        return new AsanaTaskBackend(config.config);
      case 'local':
        throw new Error('Local task backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createTagBackend(config: MinionConfig): ITagBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaTagBackend } = require('./asana');
        return new AsanaTagBackend(config.config);
      case 'local':
        throw new Error('Local tag backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createSectionBackend(config: MinionConfig): ISectionBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaSectionBackend } = require('./asana');
        return new AsanaSectionBackend(config.config);
      case 'local':
        throw new Error('Local section backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createSubtaskBackend(config: MinionConfig): ISubtaskBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaSubtaskBackend } = require('./asana');
        return new AsanaSubtaskBackend(config.config);
      case 'local':
        throw new Error('Local subtask backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createCommentBackend(config: MinionConfig): ICommentBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaCommentBackend } = require('./asana');
        return new AsanaCommentBackend(config.config);
      case 'local':
        throw new Error('Local comment backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createAttachmentBackend(config: MinionConfig): IAttachmentBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaAttachmentBackend } = require('./asana');
        return new AsanaAttachmentBackend(config.config);
      case 'local':
        throw new Error('Local attachment backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createDependencyBackend(config: MinionConfig): IDependencyBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaDependencyBackend } = require('./asana');
        return new AsanaDependencyBackend(config.config);
      case 'local':
        throw new Error('Local dependency backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createWorkflowBackend(config: MinionConfig): IWorkflowBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaWorkflowBackend } = require('./asana');
        return new AsanaWorkflowBackend(config.config);
      case 'local':
        throw new Error('Local workflow backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createStatusBackend(config: MinionConfig): IStatusBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaStatusBackend } = require('./asana');
        return new AsanaStatusBackend(config.config);
      case 'local':
        throw new Error('Local status backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createProjectBackend(config: MinionConfig): IProjectBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaProjectBackend } = require('./asana');
        return new AsanaProjectBackend(config.config);
      case 'local':
        throw new Error('Local project backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createUserBackend(config: MinionConfig): IUserBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaUserBackend } = require('./asana');
        return new AsanaUserBackend(config.config);
      case 'local':
        throw new Error('Local user backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createBatchBackend(config: MinionConfig): IBatchBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaBatchBackend } = require('./asana');
        return new AsanaBatchBackend(config.config);
      case 'local':
        throw new Error('Local batch backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createExportBackend(config: MinionConfig): IExportBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaExportBackend } = require('./asana');
        return new AsanaExportBackend(config.config);
      case 'local':
        throw new Error('Local export backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  static createListBackend(config: MinionConfig): IListBackend {
    switch (config.backend) {
      case 'asana':
        const { AsanaListBackend } = require('./asana');
        return new AsanaListBackend(config.config);
      case 'local':
        throw new Error('Local list backend not yet implemented');
      default:
        throw new Error(`Unsupported backend type: ${config.backend}`);
    }
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Creates all domain backends at once.
   *
   * Args:
   *   config: The minion configuration specifying backend type and settings.
   *
   * Returns:
   *   An object containing all 15 domain backend instances.
   */
  static createAllBackends(config: MinionConfig): AllBackends {
    return {
      config: this.createConfigBackend(config.backend, config.config?.accessToken),
      task: this.createTaskBackend(config),
      tag: this.createTagBackend(config),
      section: this.createSectionBackend(config),
      subtask: this.createSubtaskBackend(config),
      comment: this.createCommentBackend(config),
      attachment: this.createAttachmentBackend(config),
      dependency: this.createDependencyBackend(config),
      workflow: this.createWorkflowBackend(config),
      status: this.createStatusBackend(config),
      project: this.createProjectBackend(config),
      user: this.createUserBackend(config),
      batch: this.createBatchBackend(config),
      export: this.createExportBackend(config),
      list: this.createListBackend(config),
    };
  }

  /**
   * Gets a list of all supported backend types.
   *
   * Returns:
   *   Array of supported BackendType values.
   */
  static getSupportedBackends(): BackendType[] {
    return ['asana', 'local'];
  }

  /**
   * Checks if a backend type is supported.
   *
   * Args:
   *   backendType: The backend type to check.
   *
   * Returns:
   *   True if the backend type is supported, false otherwise.
   */
  static isBackendSupported(backendType: string): backendType is BackendType {
    return backendType === 'asana' || backendType === 'local';
  }
}
