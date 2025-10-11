/**
 * Tests for RowIdGenerator
 */

import { RowIdGenerator } from '../rowid.generator';
import { NamespaceMetadata } from '../namespace.types';

describe('RowIdGenerator', () => {
  let generator: RowIdGenerator;
  let metadata: NamespaceMetadata;

  beforeEach(() => {
    generator = new RowIdGenerator();

    metadata = {
      namespace: 'transactions',
      version: '1.0.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      partitionSchema: {
        order: ['year', 'country'],
        partitions: {
          year: { type: 'string', regex: '^\\d{4}$', required: true },
          country: { type: 'string', regex: '^[A-Z]{2}$', required: true }
        }
      },
      discoveredPartitions: [],
      dataFormat: 'jsonl'
    };
  });

  describe('generateRowId', () => {
    it('should generate rowId from partition values', () => {
      const rowId = generator.generateRowId(metadata, {
        year: '2025',
        country: 'US'
      });

      const parts = rowId.split('.');
      expect(parts).toHaveLength(3); // year.country.guid
      expect(parts[0]).toBe('2025');
      expect(parts[1]).toBe('US');
      expect(parts[2]).toBeTruthy(); // GUID exists
    });

    it('should include keys when includeKeys is true', () => {
      const rowId = generator.generateRowId(
        metadata,
        { year: '2025', country: 'US' },
        { includeKeys: true }
      );

      expect(rowId).toContain('year=2025');
      expect(rowId).toContain('country=US');
    });

    it('should use custom separator', () => {
      const rowId = generator.generateRowId(
        metadata,
        { year: '2025', country: 'US' },
        { separator: '/' }
      );

      expect(rowId).toContain('/');
      expect(rowId.split('/')).toHaveLength(3);
    });

    it('should use custom GUID generator', () => {
      const customGuid = 'custom-123';
      const rowId = generator.generateRowId(
        metadata,
        { year: '2025', country: 'US' },
        { guidGenerator: () => customGuid }
      );

      expect(rowId).toContain(customGuid);
      expect(rowId.endsWith(customGuid)).toBe(true);
    });

    it('should throw error if partition value is missing', () => {
      expect(() => {
        generator.generateRowId(metadata, { year: '2025' });
      }).toThrow('Missing partition value');
    });

    it('should follow partition order', () => {
      const rowId = generator.generateRowId(metadata, {
        country: 'US',
        year: '2025'
      });

      const parts = rowId.split('.');
      expect(parts[0]).toBe('2025'); // Year first (per schema order)
      expect(parts[1]).toBe('US');   // Country second
    });
  });

  describe('generateRowIdFromItem', () => {
    it('should extract partition values from item', () => {
      const item = {
        year: '2025',
        country: 'US',
        amount: 100,
        description: 'Test'
      };

      const rowId = generator.generateRowIdFromItem(metadata, item);

      expect(rowId).toContain('2025');
      expect(rowId).toContain('US');
    });

    it('should use default values if field is missing', () => {
      const metadataWithDefaults: NamespaceMetadata = {
        ...metadata,
        partitionSchema: {
          order: ['year', 'country'],
          partitions: {
            year: { type: 'string', required: true },
            country: { type: 'string', required: false, defaultValue: 'XX' }
          }
        }
      };

      const item = { year: '2025' };
      const rowId = generator.generateRowIdFromItem(metadataWithDefaults, item);

      expect(rowId).toContain('2025');
      expect(rowId).toContain('XX');
    });

    it('should derive values using deriveFromData', () => {
      const metadataWithDerive: NamespaceMetadata = {
        ...metadata,
        partitionSchema: {
          order: ['year'],
          partitions: {
            year: {
              type: 'string',
              required: true,
              deriveFromData: 'new Date(item.timestamp).getFullYear().toString()'
            }
          }
        }
      };

      const item = { timestamp: '2025-01-15T00:00:00.000Z' };
      const rowId = generator.generateRowIdFromItem(metadataWithDerive, item);

      expect(rowId).toContain('2025');
    });

    it('should throw error if required field is missing and cannot be derived', () => {
      const item = { year: '2025' };

      expect(() => {
        generator.generateRowIdFromItem(metadata, item);
      }).toThrow('Required partition field');
    });
  });

  describe('parseRowId', () => {
    it('should parse rowId into components', () => {
      const rowId = '2025.US.abc-123';
      const parsed = generator.parseRowId(rowId, metadata);

      expect(parsed.rowId).toBe(rowId);
      expect(parsed.partitionValues).toEqual(['2025', 'US']);
      expect(parsed.partitionMap).toEqual({ year: '2025', country: 'US' });
      expect(parsed.partitionPath).toBe('year=2025/country=US');
      expect(parsed.guid).toBe('abc-123');
    });

    it('should parse rowId with keys', () => {
      const rowId = 'year=2025.country=US.abc-123';
      const parsed = generator.parseRowId(rowId, metadata);

      expect(parsed.partitionValues).toEqual(['2025', 'US']);
      expect(parsed.partitionMap).toEqual({ year: '2025', country: 'US' });
      expect(parsed.guid).toBe('abc-123');
    });

    it('should parse rowId with custom separator', () => {
      const rowId = '2025/US/abc-123';
      const parsed = generator.parseRowId(rowId, metadata, '/');

      expect(parsed.partitionValues).toEqual(['2025', 'US']);
      expect(parsed.guid).toBe('abc-123');
    });

    it('should throw error if rowId has wrong number of parts', () => {
      const invalidRowId = '2025.abc-123'; // Missing country

      expect(() => {
        generator.parseRowId(invalidRowId, metadata);
      }).toThrow('Invalid rowId format');
    });

    it('should throw error if partition key mismatch', () => {
      const invalidRowId = 'year=2025.region=US.abc-123'; // region instead of country

      expect(() => {
        generator.parseRowId(invalidRowId, metadata);
      }).toThrow('expected partition key');
    });
  });

  describe('getPartitionPathFromRowId', () => {
    it('should extract partition path from rowId', () => {
      const rowId = '2025.US.abc-123';
      const path = generator.getPartitionPathFromRowId(rowId, metadata);

      expect(path).toBe('year=2025/country=US');
    });

    it('should work with custom separator', () => {
      const rowId = '2025/US/abc-123';
      const path = generator.getPartitionPathFromRowId(rowId, metadata, '/');

      expect(path).toBe('year=2025/country=US');
    });
  });

  describe('getGuidFromRowId', () => {
    it('should extract GUID from rowId', () => {
      const rowId = '2025.US.abc-123';
      const guid = generator.getGuidFromRowId(rowId);

      expect(guid).toBe('abc-123');
    });

    it('should work with custom separator', () => {
      const rowId = '2025/US/abc-123';
      const guid = generator.getGuidFromRowId(rowId, '/');

      expect(guid).toBe('abc-123');
    });
  });

  describe('validateRowId', () => {
    it('should validate valid rowId', () => {
      const rowId = '2025.US.abc-123';
      const isValid = generator.validateRowId(rowId, metadata);

      expect(isValid).toBe(true);
    });

    it('should reject rowId with invalid regex pattern', () => {
      const rowId = '25.US.abc-123'; // Year should be 4 digits
      const isValid = generator.validateRowId(rowId, metadata);

      expect(isValid).toBe(false);
    });

    it('should reject rowId with wrong format', () => {
      const rowId = '2025.abc-123'; // Missing country
      const isValid = generator.validateRowId(rowId, metadata);

      expect(isValid).toBe(false);
    });

    it('should validate regex patterns', () => {
      const validRowId = '2025.US.abc-123';
      const invalidRowId = '2025.USA.abc-123'; // Country should be 2 chars

      expect(generator.validateRowId(validRowId, metadata)).toBe(true);
      expect(generator.validateRowId(invalidRowId, metadata)).toBe(false);
    });
  });

  describe('createRowIdFromPath', () => {
    it('should create rowId from partition path and guid', () => {
      const path = 'year=2025/country=US';
      const guid = 'abc-123';
      const rowId = generator.createRowIdFromPath(path, guid, metadata);

      expect(rowId).toBe('2025.US.abc-123');
    });

    it('should include keys when requested', () => {
      const path = 'year=2025/country=US';
      const guid = 'abc-123';
      const rowId = generator.createRowIdFromPath(path, guid, metadata, '.', true);

      expect(rowId).toBe('year=2025.country=US.abc-123');
    });

    it('should use custom separator', () => {
      const path = 'year=2025/country=US';
      const guid = 'abc-123';
      const rowId = generator.createRowIdFromPath(path, guid, metadata, '/');

      expect(rowId).toBe('2025/US/abc-123');
    });
  });

  describe('GUID Formats', () => {
    it('should generate UUID by default', () => {
      const gen = new RowIdGenerator({ guidFormat: 'uuid' });
      const rowId = gen.generateRowId(metadata, { year: '2025', country: 'US' });
      const guid = gen.getGuidFromRowId(rowId);

      // UUID format: 8-4-4-4-12
      expect(guid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate short ID when configured', () => {
      const gen = new RowIdGenerator({ guidFormat: 'short' });
      const rowId = gen.generateRowId(metadata, { year: '2025', country: 'US' });
      const guid = gen.getGuidFromRowId(rowId);

      expect(guid).toHaveLength(12);
      expect(guid).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate timestamp-based ID when configured', () => {
      const gen = new RowIdGenerator({ guidFormat: 'timestamp' });
      const rowId = gen.generateRowId(metadata, { year: '2025', country: 'US' });
      const guid = gen.getGuidFromRowId(rowId);

      expect(guid).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('Configuration', () => {
    it('should use configured separator by default', () => {
      const gen = new RowIdGenerator({ separator: '/' });
      const rowId = gen.generateRowId(metadata, { year: '2025', country: 'US' });

      expect(rowId).toContain('/');
      expect(rowId.split('/')).toHaveLength(3);
    });

    it('should use configured includeKeys by default', () => {
      const gen = new RowIdGenerator({ includeKeys: true });
      const rowId = gen.generateRowId(metadata, { year: '2025', country: 'US' });

      expect(rowId).toContain('year=');
      expect(rowId).toContain('country=');
    });

    it('should allow override of configured values', () => {
      const gen = new RowIdGenerator({ separator: '/', includeKeys: true });
      const rowId = gen.generateRowId(
        metadata,
        { year: '2025', country: 'US' },
        { separator: '.', includeKeys: false }
      );

      expect(rowId).toContain('.');
      expect(rowId).not.toContain('year=');
    });
  });

  describe('Complex Partition Schemas', () => {
    it('should handle single partition', () => {
      const simpleMetadata: NamespaceMetadata = {
        ...metadata,
        partitionSchema: {
          order: ['year'],
          partitions: {
            year: { type: 'string', required: true }
          }
        }
      };

      const rowId = generator.generateRowId(simpleMetadata, { year: '2025' });
      const parts = rowId.split('.');

      expect(parts).toHaveLength(2); // year.guid
    });

    it('should handle many partitions', () => {
      const complexMetadata: NamespaceMetadata = {
        ...metadata,
        partitionSchema: {
          order: ['year', 'month', 'day', 'country', 'region'],
          partitions: {
            year: { type: 'string', required: true },
            month: { type: 'string', required: true },
            day: { type: 'string', required: true },
            country: { type: 'string', required: true },
            region: { type: 'string', required: true }
          }
        }
      };

      const rowId = generator.generateRowId(complexMetadata, {
        year: '2025',
        month: '01',
        day: '15',
        country: 'US',
        region: 'TX'
      });

      const parts = rowId.split('.');
      expect(parts).toHaveLength(6); // 5 partitions + guid
    });
  });
});
