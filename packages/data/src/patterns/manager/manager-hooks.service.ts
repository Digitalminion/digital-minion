/**
 * Manager Hooks Service
 *
 * Manages lifecycle hooks for create, update, and delete operations.
 * Provides hook registration and execution.
 */

/**
 * Hook functions
 */
export type BeforeCreateHook<T> = (item: T) => Promise<T>;
export type AfterCreateHook<T> = (item: T) => Promise<void>;
export type BeforeUpdateHook<T> = (id: string, updates: Partial<T>) => Promise<Partial<T>>;
export type AfterUpdateHook<T> = (item: T) => Promise<void>;
export type BeforeDeleteHook = (id: string) => Promise<void>;
export type AfterDeleteHook = (id: string) => Promise<void>;

/**
 * Service for managing lifecycle hooks
 */
export class ManagerHooksService<T extends { id: string }> {
  private beforeCreateHooks: BeforeCreateHook<T>[] = [];
  private afterCreateHooks: AfterCreateHook<T>[] = [];
  private beforeUpdateHooks: BeforeUpdateHook<T>[] = [];
  private afterUpdateHooks: AfterUpdateHook<T>[] = [];
  private beforeDeleteHooks: BeforeDeleteHook[] = [];
  private afterDeleteHooks: AfterDeleteHook[] = [];

  /**
   * Register a beforeCreate hook
   */
  registerBeforeCreate(hook: BeforeCreateHook<T>): void {
    this.beforeCreateHooks.push(hook);
  }

  /**
   * Register an afterCreate hook
   */
  registerAfterCreate(hook: AfterCreateHook<T>): void {
    this.afterCreateHooks.push(hook);
  }

  /**
   * Register a beforeUpdate hook
   */
  registerBeforeUpdate(hook: BeforeUpdateHook<T>): void {
    this.beforeUpdateHooks.push(hook);
  }

  /**
   * Register an afterUpdate hook
   */
  registerAfterUpdate(hook: AfterUpdateHook<T>): void {
    this.afterUpdateHooks.push(hook);
  }

  /**
   * Register a beforeDelete hook
   */
  registerBeforeDelete(hook: BeforeDeleteHook): void {
    this.beforeDeleteHooks.push(hook);
  }

  /**
   * Register an afterDelete hook
   */
  registerAfterDelete(hook: AfterDeleteHook): void {
    this.afterDeleteHooks.push(hook);
  }

  /**
   * Execute beforeCreate hooks in sequence
   */
  async executeBeforeCreate(item: T): Promise<T> {
    let transformed = item;
    for (const hook of this.beforeCreateHooks) {
      transformed = await hook(transformed);
    }
    return transformed;
  }

  /**
   * Execute afterCreate hooks in sequence
   */
  async executeAfterCreate(item: T): Promise<void> {
    for (const hook of this.afterCreateHooks) {
      await hook(item);
    }
  }

  /**
   * Execute beforeUpdate hooks in sequence
   */
  async executeBeforeUpdate(id: string, updates: Partial<T>): Promise<Partial<T>> {
    let transformed = updates;
    for (const hook of this.beforeUpdateHooks) {
      transformed = await hook(id, transformed);
    }
    return transformed;
  }

  /**
   * Execute afterUpdate hooks in sequence
   */
  async executeAfterUpdate(item: T): Promise<void> {
    for (const hook of this.afterUpdateHooks) {
      await hook(item);
    }
  }

  /**
   * Execute beforeDelete hooks in sequence
   */
  async executeBeforeDelete(id: string): Promise<void> {
    for (const hook of this.beforeDeleteHooks) {
      await hook(id);
    }
  }

  /**
   * Execute afterDelete hooks in sequence
   */
  async executeAfterDelete(id: string): Promise<void> {
    for (const hook of this.afterDeleteHooks) {
      await hook(id);
    }
  }

  /**
   * Clear all hooks (useful for testing)
   */
  clearAll(): void {
    this.beforeCreateHooks = [];
    this.afterCreateHooks = [];
    this.beforeUpdateHooks = [];
    this.afterUpdateHooks = [];
    this.beforeDeleteHooks = [];
    this.afterDeleteHooks = [];
  }
}
