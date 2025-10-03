import { Command } from 'commander';

/**
 * Interface for CLI modules that provide commands to the application.
 *
 * Modules represent distinct feature areas (e.g., tasks, tags, sections) and
 * are responsible for registering their commands with the Commander program.
 * Each module must have a unique name and description.
 */
export interface Module {
  /** Unique identifier for the module (e.g., 'task', 'tag', 'list'). */
  name: string;

  /** Human-readable description of the module's functionality. */
  description: string;

  /**
   * Registers the module's commands with the Commander program.
   *
   * Args:
   *   program: The Commander Command instance to register commands with.
   */
  register(program: Command): void;
}
