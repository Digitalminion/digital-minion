import * as fs from 'fs';
import * as path from 'path';
import { MinionConfig, LegacyMinionConfig, BackendConfiguration } from './types';

const CONFIG_DIR = '.minion';
const CONFIG_FILE = 'config.json';
const LEGACY_CONFIG_FILE = 'asana.config.json';

/**
 * Manager for loading and saving CLI configuration.
 *
 * Handles persistence of configuration data to the local filesystem in a
 * .minion directory. Configuration includes backend selection and credentials.
 */
export class ConfigManager {
  private configPath: string;
  private legacyConfigPath: string;
  private baseDir: string;

  /**
   * Creates a new ConfigManager instance.
   *
   * Args:
   *   baseDir: Base directory for configuration storage (defaults to current working directory).
   */
  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
    this.configPath = path.join(baseDir, CONFIG_DIR, CONFIG_FILE);
    this.legacyConfigPath = path.join(baseDir, CONFIG_DIR, LEGACY_CONFIG_FILE);
  }

  /**
   * Checks if a configuration file exists.
   *
   * Returns:
   *   True if configuration file exists, false otherwise.
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Loads configuration from the filesystem.
   *
   * Automatically migrates legacy single-backend configs to the new multi-backend format.
   *
   * Returns:
   *   Parsed MinionConfig object if file exists, null if not found.
   *
   * Raises:
   *   Error: If configuration file exists but cannot be read or parsed.
   */
  load(): MinionConfig | null {
    // Check for new config format first
    if (this.exists()) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content) as MinionConfig;
      } catch (error) {
        throw new Error(`Failed to load configuration: ${error}`);
      }
    }

    // Check for legacy config and migrate
    if (fs.existsSync(this.legacyConfigPath)) {
      try {
        const content = fs.readFileSync(this.legacyConfigPath, 'utf-8');
        const legacyConfig = JSON.parse(content) as LegacyMinionConfig;
        const migratedConfig = this.migrateLegacyConfig(legacyConfig);

        // Save migrated config in new format
        this.save(migratedConfig);

        // Optionally, rename legacy config to .old
        fs.renameSync(this.legacyConfigPath, `${this.legacyConfigPath}.old`);

        return migratedConfig;
      } catch (error) {
        throw new Error(`Failed to migrate legacy configuration: ${error}`);
      }
    }

    return null;
  }

  /**
   * Migrates a legacy single-backend configuration to the new multi-backend format.
   *
   * Args:
   *   legacyConfig: Legacy configuration object.
   *
   * Returns:
   *   Migrated configuration in the new format with a single backend named 'default'.
   */
  private migrateLegacyConfig(legacyConfig: LegacyMinionConfig): MinionConfig {
    const backendConfig: BackendConfiguration = {
      type: legacyConfig.backend,
      description: `Migrated ${legacyConfig.backend} backend`,
    };

    if (legacyConfig.backend === 'asana' && legacyConfig.asana) {
      backendConfig.asana = legacyConfig.asana;
    }

    return {
      defaultBackend: 'default',
      backends: {
        default: backendConfig,
      },
    };
  }

  /**
   * Saves configuration to the filesystem.
   *
   * Creates the .minion directory if it doesn't exist, then writes the
   * configuration as formatted JSON to asana.config.json.
   *
   * Args:
   *   config: Configuration object to save.
   *
   * Raises:
   *   Error: If configuration cannot be written to disk.
   */
  save(config: MinionConfig): void {
    const configDir = path.dirname(this.configPath);

    // Create .minion directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Gets the directory path where configuration is stored.
   *
   * Returns:
   *   Absolute path to the configuration directory.
   */
  getConfigDir(): string {
    return path.dirname(this.configPath);
  }

  /**
   * Adds or updates a backend configuration.
   *
   * Args:
   *   name: Name of the backend (unique identifier).
   *   backendConfig: Configuration for the backend.
   *   setAsDefault: If true, sets this backend as the default.
   *
   * Raises:
   *   Error: If no configuration exists (must run 'dm config init' first).
   */
  addBackend(name: string, backendConfig: BackendConfiguration, setAsDefault: boolean = false): void {
    const config = this.load();
    if (!config) {
      throw new Error('No configuration found. Please run "dm config init" first.');
    }

    config.backends[name] = backendConfig;

    if (setAsDefault || Object.keys(config.backends).length === 1) {
      config.defaultBackend = name;
    }

    this.save(config);
  }

  /**
   * Removes a backend configuration.
   *
   * Args:
   *   name: Name of the backend to remove.
   *
   * Raises:
   *   Error: If backend doesn't exist or if removing the last backend.
   */
  removeBackend(name: string): void {
    const config = this.load();
    if (!config) {
      throw new Error('No configuration found.');
    }

    if (!config.backends[name]) {
      throw new Error(`Backend '${name}' not found.`);
    }

    if (Object.keys(config.backends).length === 1) {
      throw new Error('Cannot remove the last backend. At least one backend must be configured.');
    }

    delete config.backends[name];

    // If we removed the default, pick a new default
    if (config.defaultBackend === name) {
      config.defaultBackend = Object.keys(config.backends)[0]!;
    }

    this.save(config);
  }

  /**
   * Sets the default backend.
   *
   * Args:
   *   name: Name of the backend to set as default.
   *
   * Raises:
   *   Error: If backend doesn't exist.
   */
  setDefaultBackend(name: string): void {
    const config = this.load();
    if (!config) {
      throw new Error('No configuration found.');
    }

    if (!config.backends[name]) {
      throw new Error(`Backend '${name}' not found.`);
    }

    config.defaultBackend = name;
    this.save(config);
  }

  /**
   * Gets a specific backend configuration.
   *
   * Args:
   *   name: Name of the backend. If not provided, returns the default backend.
   *
   * Returns:
   *   Backend configuration or undefined if not found.
   */
  getBackend(name?: string): BackendConfiguration | undefined {
    const config = this.load();
    if (!config) {
      return undefined;
    }

    const backendName = name || config.defaultBackend;
    return config.backends[backendName];
  }

  /**
   * Lists all configured backends.
   *
   * Returns:
   *   Array of [name, configuration] tuples, or empty array if no config exists.
   */
  listBackends(): Array<[string, BackendConfiguration]> {
    const config = this.load();
    if (!config) {
      return [];
    }

    return Object.entries(config.backends);
  }

  /**
   * Gets the name of the default backend.
   *
   * Returns:
   *   Name of the default backend, or undefined if no config exists.
   */
  getDefaultBackendName(): string | undefined {
    const config = this.load();
    return config?.defaultBackend;
  }
}
