/**
 * Namespace Validation Service
 *
 * Validates items against namespace partition schemas.
 */

import {
  NamespaceMetadata,
  PartitionValidationResult,
  PartitionValidationError
} from '../namespace.types';

export class NamespaceValidationService {
  /**
   * Validate item for writing to namespace
   */
  async validateWrite(
    metadata: NamespaceMetadata,
    item: any
  ): Promise<PartitionValidationResult> {
    const errors: PartitionValidationError[] = [];
    const partitionValues: Record<string, string> = {};

    // Validate partition keys
    for (const partitionKey of metadata.partitionSchema.order) {
      const fieldConfig = metadata.partitionSchema.partitions[partitionKey];

      // Handle missing fields
      if (!(partitionKey in item)) {
        // Check if field is required
        if (fieldConfig?.required !== false) {
          errors.push({
            field: partitionKey,
            code: 'MISSING_REQUIRED',
            message: `Required partition key '${partitionKey}' is missing`,
            expected: partitionKey,
            actual: undefined
          });
          continue;
        }

        // Apply default value if available
        if (fieldConfig?.defaultValue !== undefined) {
          partitionValues[partitionKey] = String(fieldConfig.defaultValue);
          continue;
        }

        // Optional field without default - skip
        continue;
      }

      const value = item[partitionKey];
      partitionValues[partitionKey] = String(value);

      // Validate field type (fieldConfig already defined above)
      if (fieldConfig) {
        const actualType = typeof value;

        // Type validation based on schema type
        if (fieldConfig.type === 'date' && actualType === 'string') {
          if (!this.isValidDateString(value)) {
            errors.push({
              field: partitionKey,
              code: 'INVALID_FORMAT',
              message: `Field '${partitionKey}' must be a valid date string`,
              expected: 'valid date string',
              actual: value
            });
          }
        } else if (fieldConfig.type === 'number' && actualType !== 'number') {
          errors.push({
            field: partitionKey,
            code: 'TYPE_MISMATCH',
            message: `Field '${partitionKey}' should be number, got ${actualType}`,
            expected: 'number',
            actual: actualType
          });
        } else if (fieldConfig.type === 'string' && actualType !== 'string') {
          errors.push({
            field: partitionKey,
            code: 'TYPE_MISMATCH',
            message: `Field '${partitionKey}' should be string, got ${actualType}`,
            expected: 'string',
            actual: actualType
          });
        }

        // Validate regex if provided
        if (fieldConfig.regex && typeof value === 'string') {
          const regex = new RegExp(fieldConfig.regex);
          if (!regex.test(value)) {
            errors.push({
              field: partitionKey,
              code: 'REGEX_MISMATCH',
              message: `Field '${partitionKey}' does not match pattern: ${fieldConfig.regex}`,
              expected: fieldConfig.regex,
              actual: value
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      partitionValues
    };
  }

  /**
   * Check if value is valid date string
   */
  private isValidDateString(value: any): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
}
