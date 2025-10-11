/**
 * RowId Generator
 *
 * Generates partition-aware composite keys that encode the partition hierarchy
 * for O(1) direct lookups without scanning the entire dataset.
 */

import { randomUUID } from 'crypto';
import { NamespaceMetadata } from './namespace.types';
import { ParsedRowId, RowIdGenerationOptions, RowIdConfig } from './rowid.types';

/**
 * Generates and parses partition-aware rowIds
 */
export class RowIdGenerator {
  private config: RowIdConfig;

  constructor(config: Partial<RowIdConfig> = {}) {
    this.config = {
      separator: '.',
      includeKeys: false,
      guidFormat: 'uuid',
      ...config
    };
  }

  /**
   * Generate rowId from partition values and item
   */
  generateRowId(
    metadata: NamespaceMetadata,
    partitionValues: Record<string, string>,
    options?: RowIdGenerationOptions
  ): string {
    const separator = options?.separator || this.config.separator;
    const includeKeys = options?.includeKeys ?? this.config.includeKeys;

    const parts: string[] = [];

    // Build partition segments in order
    for (const partitionKey of metadata.partitionSchema.order) {
      const value = partitionValues[partitionKey];

      if (!value) {
        throw new Error(`Missing partition value for '${partitionKey}'`);
      }

      if (includeKeys) {
        parts.push(`${partitionKey}=${value}`);
      } else {
        parts.push(value);
      }
    }

    // Generate GUID
    const guid = options?.guidGenerator
      ? options.guidGenerator()
      : this.generateGuid();

    // Combine: partition1.partition2.partition3.guid
    parts.push(guid);

    return parts.join(separator);
  }

  /**
   * Generate rowId from item data (extracts partition values)
   */
  generateRowIdFromItem(
    metadata: NamespaceMetadata,
    item: any,
    options?: RowIdGenerationOptions
  ): string {
    const partitionValues: Record<string, string> = {};

    // Extract partition values from item
    for (const partitionKey of metadata.partitionSchema.order) {
      const fieldSchema = metadata.partitionSchema.partitions[partitionKey];

      if (!fieldSchema) {
        throw new Error(`No schema defined for partition key '${partitionKey}'`);
      }

      // Get value from item or use default
      let value = item[partitionKey];

      if (value === undefined || value === null) {
        if (fieldSchema.defaultValue !== undefined) {
          value = fieldSchema.defaultValue;
        } else if (fieldSchema.deriveFromData) {
          // Derive value from item
          const deriveFn = new Function('item', `return ${fieldSchema.deriveFromData}`) as (
            item: any
          ) => any;
          value = deriveFn(item);
        } else if (fieldSchema.required) {
          throw new Error(
            `Required partition field '${partitionKey}' is missing and cannot be derived`
          );
        } else {
          throw new Error(`Cannot generate rowId: partition field '${partitionKey}' is missing`);
        }
      }

      partitionValues[partitionKey] = String(value);
    }

    return this.generateRowId(metadata, partitionValues, options);
  }

  /**
   * Parse rowId into components
   */
  parseRowId(
    rowId: string,
    metadata: NamespaceMetadata,
    separator: string = this.config.separator
  ): ParsedRowId {
    const parts = rowId.split(separator);

    if (parts.length !== metadata.partitionSchema.order.length + 1) {
      throw new Error(
        `Invalid rowId format: expected ${metadata.partitionSchema.order.length + 1} parts, got ${parts.length}`
      );
    }

    // Last part is GUID
    const guid = parts[parts.length - 1]!;

    // Earlier parts are partition values
    const partitionParts = parts.slice(0, -1);
    const partitionValues: string[] = [];
    const partitionMap: Record<string, string> = {};
    const pathSegments: string[] = [];

    for (let i = 0; i < partitionParts.length; i++) {
      const part = partitionParts[i]!;
      const partitionKey = metadata.partitionSchema.order[i]!;

      // Check if part includes key (format: key=value)
      let value: string;
      if (part.includes('=')) {
        const [key, val] = part.split('=');
        if (key !== partitionKey) {
          throw new Error(
            `Invalid rowId: expected partition key '${partitionKey}', got '${key}'`
          );
        }
        value = val!;
      } else {
        value = part;
      }

      partitionValues.push(value);
      partitionMap[partitionKey] = value;
      pathSegments.push(`${partitionKey}=${value}`);
    }

    const partitionPath = pathSegments.join('/');

    return {
      rowId,
      partitionValues,
      partitionPath,
      guid,
      partitionMap
    };
  }

  /**
   * Extract partition path from rowId
   */
  getPartitionPathFromRowId(
    rowId: string,
    metadata: NamespaceMetadata,
    separator: string = this.config.separator
  ): string {
    const parsed = this.parseRowId(rowId, metadata, separator);
    return parsed.partitionPath;
  }

  /**
   * Extract GUID from rowId
   */
  getGuidFromRowId(rowId: string, separator: string = this.config.separator): string {
    const parts = rowId.split(separator);
    return parts[parts.length - 1]!;
  }

  /**
   * Validate rowId format
   */
  validateRowId(
    rowId: string,
    metadata: NamespaceMetadata,
    separator: string = this.config.separator
  ): boolean {
    try {
      const parsed = this.parseRowId(rowId, metadata, separator);

      // Validate each partition value against regex if defined
      for (const [key, value] of Object.entries(parsed.partitionMap)) {
        const fieldSchema = metadata.partitionSchema.partitions[key];

        if (fieldSchema?.regex) {
          const regex = new RegExp(fieldSchema.regex);
          if (!regex.test(value)) {
            return false;
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate GUID based on configured format
   */
  private generateGuid(): string {
    switch (this.config.guidFormat) {
      case 'uuid':
        return randomUUID();

      case 'short':
        // Short alphanumeric ID (12 chars)
        return this.generateShortId(12);

      case 'timestamp':
        // Timestamp-based ID with random suffix
        return `${Date.now()}-${this.generateShortId(6)}`;

      default:
        return randomUUID();
    }
  }

  /**
   * Generate short alphanumeric ID
   */
  private generateShortId(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Create rowId from partition path and GUID
   */
  createRowIdFromPath(
    partitionPath: string,
    guid: string,
    metadata: NamespaceMetadata,
    separator: string = this.config.separator,
    includeKeys: boolean = this.config.includeKeys
  ): string {
    // Parse partition path (format: key=value/key=value/...)
    const segments = partitionPath.split('/');
    const parts: string[] = [];

    for (const segment of segments) {
      const [key, value] = segment.split('=');

      if (includeKeys) {
        parts.push(`${key}=${value}`);
      } else {
        parts.push(value!);
      }
    }

    parts.push(guid);
    return parts.join(separator);
  }
}
