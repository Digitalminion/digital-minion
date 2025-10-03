import * as fs from 'fs';
import * as path from 'path';
import { MinionConfig } from './types';

const CONFIG_DIR = '.minion';
const CONFIG_FILE = 'asana.config.json';

/**
 * Manager for loading and saving CLI configuration.
 *
 * Handles persistence of configuration data to the local filesystem in a
 * .minion directory. Configuration includes backend selection and credentials.
 */
export class ConfigManager {
  private configPath: string;

  /**
   * Creates a new ConfigManager instance.
   *
   * Args:
   *   baseDir: Base directory for configuration storage (defaults to current working directory).
   */
  constructor(baseDir: string = process.cwd()) {
    this.configPath = path.join(baseDir, CONFIG_DIR, CONFIG_FILE);
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
   * Returns:
   *   Parsed MinionConfig object if file exists, null if not found.
   *
   * Raises:
   *   Error: If configuration file exists but cannot be read or parsed.
   */
  load(): MinionConfig | null {
    if (!this.exists()) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content) as MinionConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
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
}
