/**
 * Methods Manager
 *
 * Manages method items (quality standards) at the team level.
 * Methods are stored in partition structure: standard=method/...
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { v7 as uuidv7 } from 'uuid';
import { JsonlRowStorage } from '@digital-minion/data';
import {
  MethodItem,
  MethodPartition,
  CreateMethodItemAspectInput,
  CreateMethodItemFeatureInput,
  MethodReference,
  MethodQuery
} from './types';

export interface MethodsManagerConfig {
  /** Base path to .minion directory */
  basePath: string;

  /** Team hierarchy */
  administrativeUnit: string;
  businessUnit: string;
  organization: string;
  team: string;
}

/**
 * Manages method items at the team level
 */
export class MethodsManager {
  private config: MethodsManagerConfig;
  private jsonlStorage: JsonlRowStorage;

  constructor(config: MethodsManagerConfig) {
    this.config = config;
    this.jsonlStorage = new JsonlRowStorage();
  }

  /**
   * Get team base path
   */
  private getTeamPath(): string {
    return join(
      this.config.basePath,
      `administrative_unit=${this.config.administrativeUnit}`,
      `business_unit=${this.config.businessUnit}`,
      `organization=${this.config.organization}`,
      `team=${this.config.team}`
    );
  }

  /**
   * Get method base path
   */
  private getMethodBasePath(): string {
    return join(this.getTeamPath(), 'standard=method');
  }

  /**
   * Get aspect-based partition path
   */
  getAspectPath(construct: string, aspect: string = '_'): string {
    const partitionDir = join(
      this.getMethodBasePath(),
      `construct=${construct}`,
      `aspect=${aspect}`
    );
    return join(partitionDir, this.getDataFileName(partitionDir));
  }

  /**
   * Get feature-based partition path
   */
  getFeaturePath(
    construct: string,
    language: string,
    structure: string,
    feature: string
  ): string {
    const partitionDir = join(
      this.getMethodBasePath(),
      `construct=${construct}`,
      `language=${language}`,
      `structure=${structure}`,
      `feature=${feature}`
    );
    return join(partitionDir, this.getDataFileName(partitionDir));
  }

  /**
   * Get or generate data file name for a partition
   */
  private getDataFileName(partitionDir: string): string {
    // Generate a consistent hash based on the partition path
    const hash = this.hashString(partitionDir);
    return `data-${hash}.jsonl`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Create a new aspect-based method item
   */
  async createAspectMethod(input: CreateMethodItemAspectInput): Promise<MethodItem> {
    const aspect = input.aspect || '_';
    const taxonomyPath = [input.construct, aspect];

    const methodItem: MethodItem = {
      rowId: this.generateRowId(taxonomyPath),
      id: input.id,
      subjectName: input.subjectName,
      taxonomyPath,
      taxonomyDepth: taxonomyPath.length,
      taxonomyFullPath: taxonomyPath.join('/'),
      description: input.description,
      category: input.category,
      required: input.required,
      validationRule: input.validationRule,
      artifactType: input.artifactType,
      expectedOutput: input.expectedOutput,
      tips: input.tips,
      example: input.example,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: input.metadata
    };

    // Ensure directory exists
    const path = this.getAspectPath(input.construct, aspect);
    await this.ensureDirectoryExists(path);

    // Append to JSONL file
    await this.jsonlStorage.appendRow(path, methodItem);

    return methodItem;
  }

  /**
   * Create a new feature-based method item
   */
  async createFeatureMethod(input: CreateMethodItemFeatureInput): Promise<MethodItem> {
    const taxonomyPath = [
      input.construct,
      input.language,
      input.structure,
      input.feature
    ];

    const methodItem: MethodItem = {
      rowId: this.generateRowId(taxonomyPath),
      id: input.id,
      subjectName: input.subjectName,
      taxonomyPath,
      taxonomyDepth: taxonomyPath.length,
      taxonomyFullPath: taxonomyPath.join('/'),
      description: input.description,
      category: input.category,
      required: input.required,
      validationRule: input.validationRule,
      artifactType: input.artifactType,
      expectedOutput: input.expectedOutput,
      tips: input.tips,
      example: input.example,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: input.metadata
    };

    // Ensure directory exists
    const path = this.getFeaturePath(
      input.construct,
      input.language,
      input.structure,
      input.feature
    );
    await this.ensureDirectoryExists(path);

    // Append to JSONL file
    await this.jsonlStorage.appendRow(path, methodItem);

    return methodItem;
  }

  /**
   * Get method item by rowId
   */
  async getMethod(rowId: string): Promise<MethodItem | null> {
    // Parse rowId to determine partition
    const parts = rowId.split('.');
    const guid = parts.pop(); // Remove GUID

    if (!guid) return null;

    // Try to find in all partitions that match the taxonomy path
    const methodBase = this.getMethodBasePath();

    try {
      // Scan construct directories
      const constructs = await fs.readdir(methodBase, { withFileTypes: true });

      for (const constructDir of constructs) {
        if (!constructDir.isDirectory() || !constructDir.name.startsWith('construct=')) {
          continue;
        }

        const constructPath = join(methodBase, constructDir.name);
        const partitions = await fs.readdir(constructPath, { withFileTypes: true });

        for (const partitionDir of partitions) {
          if (!partitionDir.isDirectory()) continue;

          // Could be aspect=_ or language=_
          const partitionPath = join(constructPath, partitionDir.name);

          // Recursively search for data.jsonl files
          const found = await this.searchForRowId(partitionPath, rowId);
          if (found) return found;
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
      return null;
    }

    return null;
  }

  /**
   * Recursively search for a method item by rowId
   */
  private async searchForRowId(
    dirPath: string,
    rowId: string
  ): Promise<MethodItem | null> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const filePath = join(dirPath, entry.name);
        const items = await this.jsonlStorage.readAll(filePath) as MethodItem[];
        const found = items.find(item => item.rowId === rowId);
        if (found) return found;
      } else if (entry.isDirectory()) {
        const found = await this.searchForRowId(join(dirPath, entry.name), rowId);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Query method items
   */
  async queryMethods(query: MethodQuery): Promise<MethodItem[]> {
    const results: MethodItem[] = [];
    const methodBase = this.getMethodBasePath();

    try {
      const constructs = await fs.readdir(methodBase, { withFileTypes: true });

      for (const constructDir of constructs) {
        if (!constructDir.isDirectory() || !constructDir.name.startsWith('construct=')) {
          continue;
        }

        const constructValue = constructDir.name.substring('construct='.length);

        // Filter by construct if specified
        if (query.construct && constructValue !== query.construct) {
          continue;
        }

        const constructPath = join(methodBase, constructDir.name);
        const items = await this.queryInConstruct(constructPath, query);
        results.push(...items);
      }
    } catch (error) {
      // Directory doesn't exist yet
      return [];
    }

    return results;
  }

  /**
   * Query within a construct directory
   */
  private async queryInConstruct(
    constructPath: string,
    query: MethodQuery
  ): Promise<MethodItem[]> {
    const results: MethodItem[] = [];
    const entries = await fs.readdir(constructPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = join(constructPath, entry.name);

      // Recursively collect all data.jsonl files
      const items = await this.collectMethodItems(entryPath);

      // Apply filters
      const filtered = items.filter(item => {
        if (query.category && item.category !== query.category) return false;
        if (query.required !== undefined && item.required !== query.required) return false;
        if (query.subjectName && item.subjectName !== query.subjectName) return false;

        // Taxonomy filters
        if (query.aspect && item.taxonomyPath[1] !== query.aspect) return false;
        if (query.language && item.taxonomyPath[1] !== query.language) return false;
        if (query.structure && item.taxonomyPath[2] !== query.structure) return false;
        if (query.feature && item.taxonomyPath[3] !== query.feature) return false;

        return true;
      });

      results.push(...filtered);
    }

    return results;
  }

  /**
   * Recursively collect all method items from a directory
   */
  private async collectMethodItems(dirPath: string): Promise<MethodItem[]> {
    const results: MethodItem[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const filePath = join(dirPath, entry.name);
        const items = await this.jsonlStorage.readAll(filePath) as MethodItem[];
        results.push(...items);
      } else if (entry.isDirectory()) {
        const subItems = await this.collectMethodItems(join(dirPath, entry.name));
        results.push(...subItems);
      }
    }

    return results;
  }

  /**
   * Discover all method items
   */
  async discoverMethods(): Promise<MethodReference[]> {
    const references: MethodReference[] = [];
    const methodBase = this.getMethodBasePath();

    try {
      await this.discoverMethodsRecursive(methodBase, '', references);
    } catch (error) {
      // Directory doesn't exist yet
      return [];
    }

    return references;
  }

  /**
   * Recursively discover method items and track their file paths
   */
  private async discoverMethodsRecursive(
    dirPath: string,
    relativePath: string,
    references: MethodReference[]
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const filePath = join(dirPath, entry.name);
        const items = await this.jsonlStorage.readAll(filePath) as MethodItem[];

        for (const item of items) {
          const partition = this.parsePartitionFromTaxonomy(item.taxonomyPath);
          const itemRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

          references.push({
            id: item.id,
            subjectName: item.subjectName,
            partition,
            taxonomyFullPath: item.taxonomyFullPath,
            category: item.category,
            required: item.required,
            path: `standard=method/${itemRelativePath}`
          });
        }
      } else if (entry.isDirectory()) {
        const newRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        await this.discoverMethodsRecursive(
          join(dirPath, entry.name),
          newRelativePath,
          references
        );
      }
    }
  }

  /**
   * Parse partition type from taxonomy path
   */
  private parsePartitionFromTaxonomy(taxonomyPath: string[]): MethodPartition {
    if (taxonomyPath.length === 2) {
      // Aspect-based
      return {
        type: 'aspect',
        construct: taxonomyPath[0]!,
        aspect: taxonomyPath[1]!
      };
    } else {
      // Feature-based
      return {
        type: 'feature',
        construct: taxonomyPath[0]!,
        language: taxonomyPath[1]!,
        structure: taxonomyPath[2]!,
        feature: taxonomyPath[3]!
      };
    }
  }

  /**
   * Generate rowId from taxonomy path
   */
  private generateRowId(taxonomyPath: string[]): string {
    const guid = this.generateGuid();
    return `${taxonomyPath.join('.')}.${guid}`;
  }

  /**
   * Generate GUID using UUID v7
   */
  private generateGuid(): string {
    return uuidv7();
  }

  /**
   * Ensure directory exists for file path
   */
  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = join(filePath, '..');
    await fs.mkdir(dir, { recursive: true });
  }
}
