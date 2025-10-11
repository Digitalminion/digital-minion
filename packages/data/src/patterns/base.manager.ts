/**
 * BaseManager - Generic base class for manager pattern (REFACTORED)
 *
 * Coordinates business logic and orchestrates data operations across repositories
 * and data layers. Now delegates to specialized services:
 * - ManagerCrudService: All CRUD operations
 * - ManagerHooksService: Lifecycle hooks
 * - ManagerStatsService: Statistics tracking
 * - ManagerNamespaceService: Namespace management
 *
 * @typeParam T - Entity type extending { id: string }
 *
 * @example
 * ```typescript
 * class TodoManager extends BaseManager<Todo> {
 *   protected async validate(item: Todo): Promise<ValidationResult> {
 *     const errors: string[] = [];
 *     if (!item.title) errors.push('Title is required');
 *     return { isValid: errors.length === 0, errors };
 *   }
 *
 *   protected async discoverNamespaces(): Promise<void> {
 *     this.namespaceService.setAvailableNamespaces(['active', 'archived']);
 *   }
 *
 *   protected async loadStats(): Promise<void> {
 *     await this.statsService.updateStats();
 *   }
 * }
 * ```
 */

import { DataLayer } from '../layer/data.layer';
import { FilterCriteria, QueryResult, Query } from '../layer/data.types';
import { BaseRepository } from './base.repository';
import { ManagerCrudService } from './manager/manager-crud.service';
import { ManagerHooksService } from './manager/manager-hooks.service';
import { ManagerStatsService, BaseManagerStats } from './manager/manager-stats.service';
import { ManagerNamespaceService } from './manager/manager-namespace.service';

export interface BaseManagerConfig {
  basePath: string;
  collection: string;
  defaultNamespace?: string;
  supportedNamespaces?: string[];
  useDataLayer?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Dependencies that can be injected for testing
 */
export interface BaseManagerDependencies<T extends { id: string }> {
  repository: BaseRepository<T>;
  dataLayer?: DataLayer<T>;
  dateProvider?: () => Date;
}

/**
 * Generic base manager with service delegation
 *
 * Usage:
 * - Production: new MyManager(config, { repository })
 * - Testing: new MyManager(config, { repository: mockRepo, dataLayer: mockLayer })
 */
export abstract class BaseManager<T extends { id: string }> {
  protected config: BaseManagerConfig;
  protected repository: BaseRepository<T>;
  protected dataLayer?: DataLayer<T>;
  protected dateProvider: () => Date;

  // Services
  protected crudService: ManagerCrudService<T>;
  protected hooksService: ManagerHooksService<T>;
  protected statsService: ManagerStatsService<T>;
  protected namespaceService: ManagerNamespaceService;

  constructor(config: BaseManagerConfig, dependencies: BaseManagerDependencies<T>) {
    this.config = {
      useDataLayer: true,
      ...config
    };
    this.repository = dependencies.repository;
    this.dataLayer = dependencies.dataLayer;
    this.dateProvider = dependencies.dateProvider || (() => new Date());

    // Initialize services
    this.crudService = new ManagerCrudService(this.repository, this.dataLayer);
    this.hooksService = new ManagerHooksService<T>();
    this.statsService = new ManagerStatsService<T>(
      this.crudService,
      this.dataLayer,
      this.dateProvider
    );
    this.namespaceService = new ManagerNamespaceService(this.config.supportedNamespaces);

    // Register default lifecycle hooks
    this.registerDefaultHooks();
  }

  /**
   * Register default lifecycle hooks that call abstract methods
   */
  private registerDefaultHooks(): void {
    this.hooksService.registerBeforeCreate(async (item: T) => {
      return this.beforeCreate(item);
    });

    this.hooksService.registerAfterCreate(async (item: T) => {
      await this.afterCreate(item);
    });

    this.hooksService.registerBeforeUpdate(async (id: string, updates: Partial<T>) => {
      return this.beforeUpdate(id, updates);
    });

    this.hooksService.registerAfterUpdate(async (item: T) => {
      await this.afterUpdate(item);
    });

    this.hooksService.registerBeforeDelete(async (id: string) => {
      await this.beforeDelete(id);
    });

    this.hooksService.registerAfterDelete(async (id: string) => {
      await this.afterDelete(id);
    });

    // Register stats save callback
    this.statsService.setSaveStatsCallback(async () => {
      await this.saveStats();
    });

    // Register namespace discovery callback
    this.namespaceService.setDiscoverCallback(async () => {
      await this.discoverNamespaces();
    });
  }

  /**
   * Initialize the manager (must be called after construction)
   */
  async initialize(): Promise<void> {
    await this.repository.initialize();

    if (this.config.useDataLayer && !this.dataLayer) {
      this.dataLayer = new DataLayer<T>({
        basePath: this.config.basePath,
        collection: this.config.collection,
        adapterType: 'jsonl',
        enableCaching: true,
        autoDiscoverPartitions: true
      });
      await this.dataLayer.initialize();

      // Update crud service with data layer
      this.crudService = new ManagerCrudService(this.repository, this.dataLayer);
    } else if (this.dataLayer) {
      await this.dataLayer.initialize();
    }

    await this.namespaceService.discoverNamespaces();
    await this.loadStats();
  }

  // ===== CRUD OPERATIONS (Delegated to CrudService) =====

  async getAllItems(): Promise<T[]> {
    return this.crudService.getAllItems();
  }

  async getItemsByNamespace(namespace: string): Promise<T[]> {
    return this.crudService.getItemsByNamespace(namespace);
  }

  async getItemById(id: string, preferredNamespace?: string): Promise<T | undefined> {
    return this.crudService.getItemById(id);
  }

  async search(criteria: FilterCriteria<T>): Promise<T[]> {
    return this.crudService.search(criteria);
  }

  async query(query: Partial<Query<T>>): Promise<QueryResult<T>> {
    return this.crudService.query(query);
  }

  async createItem(item: Partial<T>): Promise<T> {
    // Generate ID if not provided
    const fullItem = {
      ...item,
      id: item.id || this.generateId()
    } as T;

    // Validate
    const validation = await this.validate(fullItem);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Execute beforeCreate hooks
    const transformed = await this.hooksService.executeBeforeCreate(fullItem);

    // Create
    const created = await this.crudService.createItem(transformed);

    // Execute afterCreate hooks
    await this.hooksService.executeAfterCreate(created);

    await this.statsService.updateStats();
    return created;
  }

  async createItems(items: Partial<T>[]): Promise<T[]> {
    const fullItems: T[] = [];

    for (const item of items) {
      const fullItem = {
        ...item,
        id: item.id || this.generateId()
      } as T;

      const validation = await this.validate(fullItem);
      if (!validation.isValid) {
        throw new Error(`Validation failed for item: ${validation.errors.join(', ')}`);
      }

      const transformed = await this.hooksService.executeBeforeCreate(fullItem);
      fullItems.push(transformed);
    }

    const created = await this.crudService.createItems(fullItems);

    for (const item of created) {
      await this.hooksService.executeAfterCreate(item);
    }

    await this.statsService.updateStats();
    return created;
  }

  async updateItem(id: string, updates: Partial<T>): Promise<T | undefined> {
    // Execute beforeUpdate hooks
    const transformed = await this.hooksService.executeBeforeUpdate(id, updates);

    // Update
    const updated = await this.crudService.updateItem(id, transformed);

    if (updated) {
      // Execute afterUpdate hooks
      await this.hooksService.executeAfterUpdate(updated);
      await this.statsService.updateStats();
    }

    return updated;
  }

  async updateItems(criteria: FilterCriteria<T>, updates: Partial<T>): Promise<number> {
    const count = await this.crudService.updateItems(criteria, updates);
    await this.statsService.updateStats();
    return count;
  }

  async deleteItem(id: string): Promise<boolean> {
    // Execute beforeDelete hooks
    await this.hooksService.executeBeforeDelete(id);

    const deleted = await this.crudService.deleteItem(id);

    if (deleted) {
      // Execute afterDelete hooks
      await this.hooksService.executeAfterDelete(id);
      await this.statsService.updateStats();
    }

    return deleted;
  }

  async deleteItems(criteria: FilterCriteria<T>): Promise<number> {
    const count = await this.crudService.deleteItems(criteria);
    await this.statsService.updateStats();
    return count;
  }

  async count(criteria?: FilterCriteria<T>): Promise<number> {
    return this.crudService.count(criteria);
  }

  async exists(criteria: FilterCriteria<T>): Promise<boolean> {
    return this.crudService.exists(criteria);
  }

  // ===== STATISTICS (Delegated to StatsService) =====

  async getStats(): Promise<BaseManagerStats> {
    return this.statsService.getStats();
  }

  // ===== NAMESPACE MANAGEMENT (Delegated to NamespaceService) =====

  getAvailableNamespaces(): string[] {
    return this.namespaceService.getAvailableNamespaces();
  }

  isNamespaceSupported(namespace: string): boolean {
    return this.namespaceService.isNamespaceSupported(namespace);
  }

  // ===== LIFECYCLE =====

  async clear(): Promise<void> {
    await this.crudService.clear();
    await this.statsService.updateStats();
  }

  async disconnect(): Promise<void> {
    await this.repository.disconnect();
    if (this.dataLayer) {
      await this.dataLayer.disconnect();
    }
  }

  // ===== ABSTRACT METHODS (Must be implemented by subclass) =====

  protected abstract validate(item: T): Promise<ValidationResult>;
  protected abstract discoverNamespaces(): Promise<void>;
  protected abstract loadStats(): Promise<void>;

  // ===== LIFECYCLE HOOKS (Optional Override) =====

  protected async beforeCreate(item: T): Promise<T> {
    return item;
  }

  protected async afterCreate(item: T): Promise<void> {
    // Override in subclass if needed
  }

  protected async beforeUpdate(id: string, updates: Partial<T>): Promise<Partial<T>> {
    return updates;
  }

  protected async afterUpdate(item: T): Promise<void> {
    // Override in subclass if needed
  }

  protected async beforeDelete(id: string): Promise<void> {
    // Override in subclass if needed
  }

  protected async afterDelete(id: string): Promise<void> {
    // Override in subclass if needed
  }

  // ===== UTILITY METHODS =====

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async saveStats(): Promise<void> {
    // Override in subclass if stats should be persisted
  }

  protected handleError(error: Error, context: string): never {
    const errorMessage = `Error in ${context}: ${error.message}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

// Re-export for backward compatibility
export type { BaseManagerStats };
