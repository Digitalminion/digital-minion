/**
 * Program Manager - Main entry point for program management operations.
 *
 * Provides unified interface for working with all function types
 * (Matter, Project, Maintenance, Framework) within an organizational context.
 */

import { AllBackends } from '@digital-minion/lib';
import { ProgramContext, FunctionType } from './core/types';
import { ProjectManager } from './managers/project-manager';
import { FrameworkManager } from './managers/framework-manager';
import { LocalFrameworkAdapter } from './adapters/local-framework-adapter';

/**
 * Configuration for Program Manager.
 */
export interface ProgramManagerConfig {
  /** Backend instance */
  backend: AllBackends;

  /** Program context */
  context: ProgramContext;
}

/**
 * Program Manager provides unified access to all function types.
 */
export class ProgramManager {
  private _projectManager?: ProjectManager;
  private _frameworkManager?: FrameworkManager;

  constructor(private config: ProgramManagerConfig) {}

  /**
   * Get the Project manager.
   * Lazy-loaded on first access.
   */
  get project(): ProjectManager {
    if (!this._projectManager) {
      this._projectManager = new ProjectManager({
        backend: this.config.backend,
        context: this.config.context,
      });
    }
    return this._projectManager;
  }

  /**
   * Get the Framework manager.
   * Lazy-loaded on first access.
   */
  get framework(): FrameworkManager {
    if (!this._frameworkManager) {
      const adapter = new LocalFrameworkAdapter({
        backend: this.config.backend,
        context: this.config.context,
      });

      this._frameworkManager = new FrameworkManager({
        adapter,
        context: this.config.context,
      });
    }
    return this._frameworkManager;
  }

  /**
   * Initialize the manager.
   * Must be called before using any function-specific managers.
   */
  async initialize(): Promise<void> {
    // Initialize based on function type in context
    switch (this.config.context.functionType) {
      case 'project':
        await this.project.initialize();
        break;
      case 'framework':
        await this.framework.initialize();
        break;
      case 'matter':
        // TODO: Initialize Matter manager when implemented
        throw new Error('Matter function type not yet implemented');
      case 'maintenance':
        // TODO: Initialize Maintenance manager when implemented
        throw new Error('Maintenance function type not yet implemented');
      default:
        throw new Error(`Unknown function type: ${this.config.context.functionType}`);
    }
  }

  /**
   * Get the current context.
   */
  getContext(): ProgramContext {
    return this.config.context;
  }

  /**
   * Update the context (e.g., switch function type, team, etc.).
   */
  updateContext(updates: Partial<ProgramContext>): void {
    this.config.context = {
      ...this.config.context,
      ...updates,
    };

    // Clear cached managers to force re-initialization
    this._projectManager = undefined;
    this._frameworkManager = undefined;
  }

  /**
   * Switch to a different function type.
   */
  async switchFunctionType(functionType: FunctionType): Promise<void> {
    this.updateContext({ functionType });
    await this.initialize();
  }

  /**
   * Get statistics across all function types.
   */
  async getAllStatistics(): Promise<{
    functionType: FunctionType;
    project?: Awaited<ReturnType<ProjectManager['getStatistics']>>;
    framework?: Awaited<ReturnType<FrameworkManager['getStatistics']>>;
  }> {
    const stats: any = {
      functionType: this.config.context.functionType,
    };

    switch (this.config.context.functionType) {
      case 'project':
        stats.project = await this.project.getStatistics();
        break;
      case 'framework':
        // Framework stats require frameworkId parameter
        // TODO: Determine how to get frameworkId from context
        break;
      case 'matter':
        // TODO: Add matter stats
        break;
      case 'maintenance':
        // TODO: Add maintenance stats
        break;
    }

    return stats;
  }
}

/**
 * Factory function to create a Program Manager.
 */
export async function createProgramManager(
  config: ProgramManagerConfig
): Promise<ProgramManager> {
  const manager = new ProgramManager(config);
  await manager.initialize();
  return manager;
}
