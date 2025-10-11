/**
 * JSON Object Storage - Refactored
 *
 * Clean facade over specialized services:
 * - JsonIOService: File I/O with atomic writes
 * - JsonValidatorService: Schema validation
 */

import {
  IJsonObjectStorage,
  StorageWriteOptions,
  StorageValidationResult,
  StorageSchema,
  StorageStats
} from './storage.types';
import { JsonIOService } from './json/io.service';
import { JsonValidatorService } from './json/validator.service';

/**
 * JSON object storage with validation and atomic writes
 */
export class JsonObjectStorage<T = any> implements IJsonObjectStorage<T> {
  private ioService: JsonIOService;
  private validator: JsonValidatorService;

  constructor() {
    this.ioService = new JsonIOService();
    this.validator = new JsonValidatorService();
  }

  /**
   * Read JSON object from file
   */
  async read(path: string): Promise<T> {
    return this.ioService.read<T>(path);
  }

  /**
   * Write JSON object to file
   */
  async write(path: string, data: T, options: StorageWriteOptions = {}): Promise<void> {
    await this.ioService.write(path, data, options);
  }

  /**
   * Update JSON object
   */
  async update(path: string, updates: Partial<T>): Promise<T> {
    return this.ioService.update<T>(path, updates);
  }

  /**
   * Validate JSON object against schema
   */
  async validate(path: string, schema?: StorageSchema): Promise<StorageValidationResult> {
    try {
      const data = await this.read(path);
      return this.validator.validate(data, schema);
    } catch (error: any) {
      // Return validation error for corrupt JSON
      return {
        isValid: false,
        errors: [{
          field: 'root',
          code: 'INVALID_JSON',
          severity: 'error',
          message: error.message || 'Invalid JSON',
          actual: undefined
        }],
        warnings: []
      };
    }
  }

  /**
   * Check if file exists
   */
  async exists(path: string): Promise<boolean> {
    return this.ioService.exists(path);
  }

  /**
   * Get file statistics
   */
  async getStats(path: string): Promise<StorageStats> {
    return this.ioService.getStats(path);
  }

  /**
   * Delete file
   */
  async delete(path: string): Promise<void> {
    return this.ioService.delete(path);
  }

  /**
   * Create backup
   */
  async backup(path: string): Promise<string> {
    return this.ioService.backup(path);
  }
}
