import { Command } from 'commander';
import { Module } from './types';

/**
 * Registry for managing and organizing CLI modules.
 *
 * Maintains a collection of modules that provide commands to the CLI. Each module
 * represents a distinct feature area (e.g., tasks, tags, sections) and can register
 * its commands with the main program.
 */
export class ModuleRegistry {
  private modules: Map<string, Module> = new Map();

  /**
   * Registers a module with the registry.
   *
   * Args:
   *   module: The module to register. Must implement the Module interface.
   */
  register(module: Module): void {
    this.modules.set(module.name, module);
  }

  /**
   * Retrieves all registered modules.
   *
   * Returns:
   *   Array of all registered Module instances.
   */
  getModules(): Module[] {
    return Array.from(this.modules.values());
  }

  /**
   * Applies all registered modules to a Commander program.
   *
   * Iterates through all modules and calls their register method to add
   * their commands to the CLI program.
   *
   * Args:
   *   program: The Commander Command instance to register modules with.
   */
  applyModules(program: Command): void {
    for (const module of this.modules.values()) {
      module.register(program);
    }
  }
}
