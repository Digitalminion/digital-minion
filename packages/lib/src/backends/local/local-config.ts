import * as path from 'path';
import * as os from 'os';

/**
 * Configuration for local file-based backend.
 *
 * Defines where tasks and related data are stored on the local filesystem.
 */
export interface LocalConfig {
  /**
   * Base directory for storing all local data.
   * Defaults to ~/.digital-minion/data
   */
  basePath?: string;

  /**
   * Team name for organizing data.
   * Used as the top-level directory under basePath.
   */
  teamName: string;

  /**
   * Project name for organizing data.
   * Used as the subdirectory under team.
   */
  projectName: string;

  /**
   * Project/workspace identifier.
   * Used for internal references.
   */
  projectId: string;

  /**
   * Data format for storage.
   * Defaults to 'jsonl' for efficient line-by-line reading.
   */
  format?: 'json' | 'jsonl';

  /**
   * Enable caching for query operations.
   * Defaults to true.
   */
  enableCaching?: boolean;

  /**
   * Auto-discover partitions on initialization.
   * Defaults to true.
   */
  autoDiscoverPartitions?: boolean;

  /**
   * Partitioning strategy for tasks.
   * Defaults to 'completion-section' for efficient querying.
   */
  partitionStrategy?: 'none' | 'completion' | 'section' | 'completion-section';
}

/**
 * Base class for local backend implementations.
 *
 * Provides common configuration and utilities for working with
 * the local file-based data layer.
 */
export abstract class LocalBackendBase {
  protected readonly config: Required<LocalConfig>;
  protected readonly basePath: string;
  protected readonly projectId: string;
  protected readonly teamName: string;
  protected readonly projectName: string;

  constructor(config: LocalConfig) {
    // Apply defaults
    const defaultBasePath = path.join(os.homedir(), '.digital-minion', 'data');

    this.config = {
      basePath: config.basePath || defaultBasePath,
      teamName: config.teamName,
      projectName: config.projectName,
      projectId: config.projectId,
      format: config.format || 'jsonl',
      enableCaching: config.enableCaching !== false,
      autoDiscoverPartitions: config.autoDiscoverPartitions !== false,
      partitionStrategy: config.partitionStrategy || 'completion-section',
    };

    // Resolve basePath to absolute path to ensure file operations work correctly
    this.basePath = path.resolve(this.config.basePath);
    this.teamName = this.config.teamName;
    this.projectName = this.config.projectName;
    this.projectId = this.config.projectId;
  }

  /**
   * Gets the project path: basePath/teamName/projectName
   */
  protected getProjectPath(): string {
    return path.join(this.basePath, this.teamName, this.projectName);
  }

  /**
   * Gets the data path: basePath/teamName/projectName/data
   */
  protected getDataPath(): string {
    return path.join(this.getProjectPath(), 'data');
  }

  /**
   * Gets the manifest path: basePath/teamName/projectName/data/manifest.json
   */
  protected getManifestPath(): string {
    return path.join(this.getDataPath(), 'manifest.json');
  }

  /**
   * Gets the default data format.
   */
  protected getFormat(): 'json' | 'jsonl' {
    return this.config.format;
  }
}
