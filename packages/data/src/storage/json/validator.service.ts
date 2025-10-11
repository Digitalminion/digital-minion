/**
 * JSON Validation Service
 *
 * Handles schema validation for JSON data.
 */

import {
  StorageValidationResult,
  StorageValidationError,
  StorageValidationWarning,
  StorageSchema
} from '../storage.types';

export class JsonValidatorService {
  /**
   * Validate data against optional schema
   */
  validate(data: any, schema?: StorageSchema): StorageValidationResult {
    const errors: StorageValidationError[] = [];
    const warnings: StorageValidationWarning[] = [];

    // Check if data is valid JSON (already parsed, so check for basic structure)
    if (data === null || data === undefined) {
      errors.push({
        field: 'root',
        code: 'NULL_DATA',
        severity: 'error',
        message: 'Data is null or undefined',
        actual: data
      });
    }

    // Validate against schema if provided
    if (schema) {
      this.validateAgainstSchema(data, schema, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate data against schema
   */
  private validateAgainstSchema(
    data: any,
    schema: StorageSchema,
    errors: StorageValidationError[],
    warnings: StorageValidationWarning[]
  ): void {
    // Validate root type if specified
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema.type) {
        errors.push({
          field: 'root',
          code: 'TYPE_MISMATCH',
          severity: 'error',
          message: `Root should be ${schema.type}, got ${actualType}`,
          expected: schema.type,
          actual: actualType
        });
        return; // Don't continue validation if root type is wrong
      }
    }

    // Required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push({
            field,
            code: 'REQUIRED_FIELD_MISSING',
            severity: 'error',
            message: `Required field '${field}' is missing`,
            expected: field,
            actual: undefined
          });
        }
      }
    }

    // Field types
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        const value = data[field];

        // Skip if not present and not required
        if (value === undefined && !(schema.required?.includes(field))) {
          continue;
        }

        // Type check
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (fieldSchema.type && actualType !== fieldSchema.type) {
          errors.push({
            field,
            code: 'TYPE_MISMATCH',
            severity: 'error',
            message: `Field '${field}' should be ${fieldSchema.type}, got ${actualType}`,
            expected: fieldSchema.type,
            actual: actualType
          });
        }

        // Array item validation
        if (fieldSchema.type === 'array' && fieldSchema.items && Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            const itemType = typeof item;

            if (fieldSchema.items.type && itemType !== fieldSchema.items.type) {
              errors.push({
                field: `${field}[${i}]`,
                code: 'TYPE_MISMATCH',
                severity: 'error',
                message: `Array item should be ${fieldSchema.items.type}, got ${itemType}`,
                expected: fieldSchema.items.type,
                actual: itemType
              });
            }
          }
        }

        // Min/max validation for numbers
        if (fieldSchema.type === 'number' && typeof value === 'number') {
          if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
            errors.push({
              field,
              code: 'BELOW_MINIMUM',
              severity: 'error',
              message: `Field '${field}' must be at minimum ${fieldSchema.minimum}`,
              expected: `>= ${fieldSchema.minimum}`,
              actual: value
            });
          }
          if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
            errors.push({
              field,
              code: 'ABOVE_MAXIMUM',
              severity: 'error',
              message: `Field '${field}' must be at maximum ${fieldSchema.maximum}`,
              expected: `<= ${fieldSchema.maximum}`,
              actual: value
            });
          }
        }

        // Pattern validation for strings
        if (fieldSchema.type === 'string' && fieldSchema.pattern && typeof value === 'string') {
          const regex = new RegExp(fieldSchema.pattern);
          if (!regex.test(value)) {
            errors.push({
              field,
              code: 'TYPE_MISMATCH',
              severity: 'error',
              message: `Field '${field}' does not match pattern: ${fieldSchema.pattern}`,
              expected: fieldSchema.pattern,
              actual: value
            });
          }
        }
      }
    }

    // Additional properties warning
    if (schema.properties && schema.additionalProperties === false) {
      const knownFields = Object.keys(schema.properties);
      for (const field of Object.keys(data)) {
        if (!knownFields.includes(field)) {
          warnings.push({
            field,
            code: 'ADDITIONAL_PROPERTY',
            message: `Additional property '${field}' not defined in schema`,
            suggestion: `Remove this field or add it to the schema`
          });
        }
      }
    }
  }
}
