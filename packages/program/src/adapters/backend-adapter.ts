/**
 * Backend adapter interface for translating program domain models
 * to backend-specific implementations.
 *
 * Each function type (Matter/Project/Maintenance) has its own adapter
 * that handles the semantic mapping between domain models and backend primitives.
 */

import { AllBackends } from '@digital-minion/lib';
import { ProgramContext } from '../core/types';

/**
 * Base backend adapter interface.
 * Provides common functionality for all function-specific adapters.
 */
export interface IBackendAdapter {
  /** Backend instance */
  readonly backend: AllBackends;

  /** Program context */
  readonly context: ProgramContext;

  /**
   * Check if backend supports a specific feature.
   *
   * Args:
   *   feature: Feature name (e.g., 'milestones', 'dependencies', 'custom-fields')
   *
   * Returns:
   *   True if feature is supported, false otherwise.
   */
  supportsFeature(feature: string): boolean;

  /**
   * Initialize the adapter (e.g., ensure project exists, create sections).
   *
   * Returns:
   *   Promise that resolves when initialization is complete.
   */
  initialize(): Promise<void>;

  /**
   * Get backend-specific metadata for tagging.
   *
   * Returns:
   *   Array of tags to apply to items for proper identification.
   */
  getMetadataTags(): string[];
}

/**
 * Configuration for backend adapters.
 */
export interface BackendAdapterConfig {
  /** Backend instance to use */
  backend: AllBackends;

  /** Program context */
  context: ProgramContext;

  /** Optional: Additional configuration */
  options?: {
    /** Whether to create missing sections/projects automatically */
    autoCreate?: boolean;

    /** Whether to use tags for metadata */
    useTags?: boolean;

    /** Whether to use custom fields for metadata (if supported) */
    useCustomFields?: boolean;
  };
}

/**
 * Abstract base class for backend adapters.
 * Provides common functionality and enforces interface compliance.
 */
export abstract class BaseBackendAdapter implements IBackendAdapter {
  constructor(
    public readonly backend: AllBackends,
    public readonly context: ProgramContext,
    protected readonly config?: BackendAdapterConfig['options']
  ) {}

  abstract supportsFeature(feature: string): boolean;
  abstract initialize(): Promise<void>;

  /**
   * Get standard metadata tags for this context.
   */
  getMetadataTags(): string[] {
    const tags: string[] = [];

    // Add function type
    tags.push(`function:${this.context.functionType}`);

    // Add organizational hierarchy
    tags.push(`administrative-unit:${this.context.administrativeUnit.name.toLowerCase().replace(/\s+/g, '-')}`);
    tags.push(`bu:${this.context.businessUnit.name.toLowerCase().replace(/\s+/g, '-')}`);
    tags.push(`org:${this.context.organization.name.toLowerCase().replace(/\s+/g, '-')}`);
    tags.push(`team:${this.context.team.name.toLowerCase().replace(/\s+/g, '-')}`);

    return tags;
  }

  /**
   * Utility: Add metadata tags to a backend item.
   *
   * Args:
   *   itemId: Backend item ID
   *   additionalTags: Additional tags beyond standard metadata
   */
  protected async addMetadataTags(itemId: string, additionalTags: string[] = []): Promise<void> {
    const tags = [...this.getMetadataTags(), ...additionalTags];

    if (this.config?.useTags !== false) {
      for (const tag of tags) {
        try {
          await this.backend.tag.addTag(itemId, tag);
        } catch (error) {
          // Tag might not exist, continue
          console.warn(`Failed to add tag ${tag} to ${itemId}:`, error);
        }
      }
    }
  }

  /**
   * Utility: Create a unique ID.
   */
  protected generateId(): string {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  /**
   * Utility: Format date to YYYY-MM-DD.
   */
  protected formatDate(date?: Date | string): string | undefined {
    if (!date) return undefined;

    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  /**
   * Utility: Get current ISO timestamp.
   */
  protected now(): string {
    return new Date().toISOString();
  }
}
