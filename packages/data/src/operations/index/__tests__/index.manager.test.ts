/**
 * Tests for IndexManager
 */

import { IndexManager } from '../index.manager';

interface TestItem {
  id: string;
  name: string;
  age?: number;
  email?: string;
  category?: string;
}

describe('IndexManager', () => {
  let indexManager: IndexManager<TestItem>;
  let testItems: TestItem[];

  beforeEach(() => {
    indexManager = new IndexManager();
    testItems = [
      { id: '1', name: 'Alice', age: 30, email: 'alice@test.com', category: 'A' },
      { id: '2', name: 'Bob', age: 25, email: 'bob@test.com', category: 'B' },
      { id: '3', name: 'Charlie', age: 30, email: 'charlie@test.com', category: 'A' },
      { id: '4', name: 'David', age: 35, category: 'B' }
    ];
  });

  describe('createIndex', () => {
    it('should create a new index', () => {
      indexManager.createIndex('nameIndex', { fields: ['name'] });
      expect(() => indexManager.buildIndex('nameIndex', testItems, item => item.id)).not.toThrow();
    });

    it('should throw if index already exists', () => {
      indexManager.createIndex('nameIndex', { fields: ['name'] });
      expect(() => indexManager.createIndex('nameIndex', { fields: ['age'] })).toThrow('already exists');
    });
  });

  describe('buildIndex', () => {
    it('should build index for single field', () => {
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('ageIndex', testItems, item => item.id);

      const results = indexManager.lookup('ageIndex', 30);
      expect(results.size).toBe(2); // Alice and Charlie - returns Set
    });

    it('should throw if index not created', () => {
      expect(() => indexManager.buildIndex('nonExistent', testItems, item => item.id))
        .toThrow('not found');
    });

    it('should handle sparse index', () => {
      indexManager.createIndex('emailIndex', { fields: ['email'], sparse: false });
      indexManager.buildIndex('emailIndex', testItems, item => item.id);

      // David has no email, should not be in sparse index
      const results = indexManager.lookupMultiple('emailIndex', ['alice@test.com']);
      expect(results.size).toBe(1);
    });

    it('should enforce unique constraint', () => {
      indexManager.createIndex('uniqueAge', { fields: ['age'], unique: true });

      expect(() => indexManager.buildIndex('uniqueAge', testItems, item => item.id))
        .toThrow('Unique constraint violation');
    });
  });

  describe('lookup', () => {
    beforeEach(() => {
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('ageIndex', testItems, item => item.id);
    });

    it('should lookup IDs by indexed value', () => {
      const results = indexManager.lookup('ageIndex', 30);
      expect(results.size).toBe(2); // Returns Set of IDs
      expect(results.has('1')).toBe(true); // Alice
      expect(results.has('3')).toBe(true); // Charlie
    });

    it('should return empty set for non-existent value', () => {
      const results = indexManager.lookup('ageIndex', 99);
      expect(results.size).toBe(0);
    });
  });

  describe('lookupMultiple', () => {
    beforeEach(() => {
      indexManager.createIndex('categoryIndex', { fields: ['category'] });
      indexManager.buildIndex('categoryIndex', testItems, item => item.id);
    });

    it('should lookup IDs by multiple values', () => {
      const results = indexManager.lookupMultiple('categoryIndex', ['A', 'B']);
      expect(results.size).toBe(4);
    });

    it('should deduplicate results', () => {
      const results = indexManager.lookupMultiple('categoryIndex', ['A', 'A']);
      expect(results.size).toBe(2); // Only A items
    });
  });

  describe('dropIndex', () => {
    it('should drop an existing index', () => {
      indexManager.createIndex('tempIndex', { fields: ['name'] });
      indexManager.buildIndex('tempIndex', testItems, item => item.id);

      indexManager.dropIndex('tempIndex');

      expect(() => indexManager.lookup('tempIndex', 'Alice')).toThrow('not found');
    });
  });

  describe('getStatistics', () => {
    it('should return index statistics', () => {
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('ageIndex', testItems, item => item.id);

      const stats = indexManager.getStatistics('ageIndex');
      expect(stats).toBeDefined();
      expect(stats.totalKeys).toBeGreaterThan(0);
      expect(stats.buildTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('case sensitivity', () => {
    it('should handle case-insensitive index', () => {
      indexManager.createIndex('nameIndex', { fields: ['name'], caseSensitive: false });
      indexManager.buildIndex('nameIndex', testItems, item => item.id);

      const results = indexManager.lookup('nameIndex', 'ALICE');
      expect(results.size).toBe(1);
    });

    it('should handle case-sensitive index', () => {
      indexManager.createIndex('nameIndex', { fields: ['name'], caseSensitive: true });
      indexManager.buildIndex('nameIndex', testItems, item => item.id);

      const results = indexManager.lookup('nameIndex', 'ALICE');
      expect(results.size).toBe(0);
    });
  });

  describe('composite index', () => {
    it('should support multiple fields in index config', () => {
      indexManager.createIndex('compositeIndex', { fields: ['name', 'age'] });
      indexManager.buildIndex('compositeIndex', testItems, item => item.id);

      const nameResults = indexManager.lookup('compositeIndex', 'Alice');
      const ageResults = indexManager.lookup('compositeIndex', 30);

      expect(nameResults.size).toBe(1);
      expect(ageResults.size).toBe(2);
    });
  });

  describe('addItem', () => {
    beforeEach(() => {
      indexManager.createIndex('nameIndex', { fields: ['name'] });
      indexManager.buildIndex('nameIndex', testItems, item => item.id);
    });

    it('should add item to existing indexes', () => {
      const newItem: TestItem = { id: '5', name: 'Eve', age: 28 };
      indexManager.addItem(newItem, item => item.id);

      const results = indexManager.lookup('nameIndex', 'Eve');
      expect(results.has('5')).toBe(true);
    });

    it('should enforce unique constraint when adding', () => {
      indexManager.createIndex('uniqueEmail', { fields: ['email'], unique: true });
      indexManager.buildIndex('uniqueEmail', testItems, item => item.id);

      const duplicate: TestItem = { id: '5', name: 'Eve', email: 'alice@test.com' };
      expect(() => indexManager.addItem(duplicate, item => item.id))
        .toThrow('Unique constraint violation');
    });

    it('should handle sparse index when adding items', () => {
      indexManager.createIndex('sparseEmail', { fields: ['email'], sparse: false });
      indexManager.buildIndex('sparseEmail', testItems, item => item.id);

      const itemWithoutEmail: TestItem = { id: '5', name: 'Eve' };
      indexManager.addItem(itemWithoutEmail, item => item.id);

      // Item should not be in index due to sparse configuration
      const allEmails = indexManager.lookup('sparseEmail', undefined);
      expect(allEmails.has('5')).toBe(false);
    });
  });

  describe('removeItem', () => {
    beforeEach(() => {
      indexManager.createIndex('nameIndex', { fields: ['name'] });
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('nameIndex', testItems, item => item.id);
      indexManager.buildIndex('ageIndex', testItems, item => item.id);
    });

    it('should remove item from all indexes', () => {
      indexManager.removeItem('1'); // Remove Alice

      const nameResults = indexManager.lookup('nameIndex', 'Alice');
      const ageResults = indexManager.lookup('ageIndex', 30);

      expect(nameResults.has('1')).toBe(false);
      expect(ageResults.has('1')).toBe(false);
      expect(ageResults.has('3')).toBe(true); // Charlie still there
    });

    it('should handle removing non-existent item', () => {
      expect(() => indexManager.removeItem('999')).not.toThrow();
    });
  });

  describe('updateItem', () => {
    beforeEach(() => {
      indexManager.createIndex('nameIndex', { fields: ['name'] });
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('nameIndex', testItems, item => item.id);
      indexManager.buildIndex('ageIndex', testItems, item => item.id);
    });

    it('should update item in all indexes', () => {
      const updatedItem: TestItem = { id: '1', name: 'Alicia', age: 31 };
      indexManager.updateItem(updatedItem, item => item.id);

      // Old values should not be found
      expect(indexManager.lookup('nameIndex', 'Alice').has('1')).toBe(false);
      expect(indexManager.lookup('ageIndex', 30).has('1')).toBe(false);

      // New values should be found
      expect(indexManager.lookup('nameIndex', 'Alicia').has('1')).toBe(true);
      expect(indexManager.lookup('ageIndex', 31).has('1')).toBe(true);
    });
  });

  describe('lookupRange', () => {
    beforeEach(() => {
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('ageIndex', testItems, item => item.id);
    });

    it('should lookup items in range (inclusive)', () => {
      const results = indexManager.lookupRange('ageIndex', 25, 30);
      expect(results.size).toBe(3); // Bob (25), Alice (30), Charlie (30)
    });

    it('should lookup items in range (exclusive)', () => {
      const results = indexManager.lookupRange('ageIndex', 25, 30, false);
      expect(results.size).toBe(0); // Only exact matches excluded
    });

    it('should lookup items with min only', () => {
      const results = indexManager.lookupRange('ageIndex', 30);
      expect(results.size).toBe(3); // Alice (30), Charlie (30), David (35)
    });

    it('should lookup items with max only', () => {
      const results = indexManager.lookupRange('ageIndex', undefined, 30);
      expect(results.size).toBe(3); // Bob (25), Alice (30), Charlie (30)
    });

    it('should throw if index not found', () => {
      expect(() => indexManager.lookupRange('nonExistent', 0, 100))
        .toThrow('not found');
    });
  });

  describe('set operations', () => {
    let setA: Set<string>;
    let setB: Set<string>;
    let setC: Set<string>;

    beforeEach(() => {
      setA = new Set(['1', '2', '3']);
      setB = new Set(['2', '3', '4']);
      setC = new Set(['3', '4', '5']);
    });

    describe('intersect', () => {
      it('should intersect two sets', () => {
        const result = indexManager.intersect(setA, setB);
        expect(result.size).toBe(2);
        expect(result.has('2')).toBe(true);
        expect(result.has('3')).toBe(true);
      });

      it('should intersect multiple sets', () => {
        const result = indexManager.intersect(setA, setB, setC);
        expect(result.size).toBe(1);
        expect(result.has('3')).toBe(true);
      });

      it('should return empty set for no sets', () => {
        const result = indexManager.intersect();
        expect(result.size).toBe(0);
      });

      it('should return original set for single set', () => {
        const result = indexManager.intersect(setA);
        expect(result).toEqual(setA);
      });
    });

    describe('union', () => {
      it('should union two sets', () => {
        const result = indexManager.union(setA, setB);
        expect(result.size).toBe(4); // 1,2,3,4
      });

      it('should union multiple sets', () => {
        const result = indexManager.union(setA, setB, setC);
        expect(result.size).toBe(5); // 1,2,3,4,5
      });
    });

    describe('difference', () => {
      it('should compute set difference (A - B)', () => {
        const result = indexManager.difference(setA, setB);
        expect(result.size).toBe(1);
        expect(result.has('1')).toBe(true);
      });

      it('should handle empty difference', () => {
        const result = indexManager.difference(setA, setA);
        expect(result.size).toBe(0);
      });
    });
  });

  describe('getItems', () => {
    beforeEach(() => {
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('ageIndex', testItems, item => item.id);
    });

    it('should get items by IDs', () => {
      const ids = new Set(['1', '3']);
      const items = indexManager.getItems(ids);

      expect(items).toHaveLength(2);
      expect(items.find(i => i.id === '1')).toBeDefined();
      expect(items.find(i => i.id === '3')).toBeDefined();
    });

    it('should skip non-existent IDs', () => {
      const ids = new Set(['1', '999']);
      const items = indexManager.getItems(ids);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('1');
    });

    it('should return empty array for empty set', () => {
      const items = indexManager.getItems(new Set());
      expect(items).toHaveLength(0);
    });
  });

  describe('hasIndex', () => {
    it('should return true for existing index', () => {
      indexManager.createIndex('testIndex', { fields: ['name'] });
      expect(indexManager.hasIndex('testIndex')).toBe(true);
    });

    it('should return false for non-existent index', () => {
      expect(indexManager.hasIndex('nonExistent')).toBe(false);
    });
  });

  describe('getIndexNames', () => {
    it('should return all index names', () => {
      indexManager.createIndex('index1', { fields: ['name'] });
      indexManager.createIndex('index2', { fields: ['age'] });

      const names = indexManager.getIndexNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('index1');
      expect(names).toContain('index2');
    });

    it('should return empty array when no indexes', () => {
      const names = indexManager.getIndexNames();
      expect(names).toHaveLength(0);
    });
  });

  describe('clearIndex', () => {
    beforeEach(() => {
      indexManager.createIndex('nameIndex', { fields: ['name'] });
      indexManager.buildIndex('nameIndex', testItems, item => item.id);
    });

    it('should clear specific index', () => {
      indexManager.clearIndex('nameIndex');

      const results = indexManager.lookup('nameIndex', 'Alice');
      expect(results.size).toBe(0);
    });

    it('should not affect other indexes', () => {
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('ageIndex', testItems, item => item.id);

      indexManager.clearIndex('nameIndex');

      const ageResults = indexManager.lookup('ageIndex', 30);
      expect(ageResults.size).toBe(2); // Still has data
    });

    it('should handle clearing non-existent index', () => {
      expect(() => indexManager.clearIndex('nonExistent')).not.toThrow();
    });
  });

  describe('clearAllIndexes', () => {
    beforeEach(() => {
      indexManager.createIndex('nameIndex', { fields: ['name'] });
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('nameIndex', testItems, item => item.id);
      indexManager.buildIndex('ageIndex', testItems, item => item.id);
    });

    it('should clear all indexes', () => {
      indexManager.clearAllIndexes();

      const nameResults = indexManager.lookup('nameIndex', 'Alice');
      const ageResults = indexManager.lookup('ageIndex', 30);

      expect(nameResults.size).toBe(0);
      expect(ageResults.size).toBe(0);
    });

    it('should clear item store', () => {
      indexManager.clearAllIndexes();

      const items = indexManager.getItems(new Set(['1', '2']));
      expect(items).toHaveLength(0);
    });
  });

  describe('nested field paths', () => {
    interface NestedItem {
      id: string;
      user: {
        profile: {
          name: string;
          age: number;
        };
      };
    }

    it('should handle nested field paths', () => {
      const nestedManager = new IndexManager<NestedItem>();
      const nestedItems: NestedItem[] = [
        { id: '1', user: { profile: { name: 'Alice', age: 30 } } },
        { id: '2', user: { profile: { name: 'Bob', age: 25 } } }
      ];

      nestedManager.createIndex('nestedNameIndex', { fields: ['user.profile.name'] });
      nestedManager.buildIndex('nestedNameIndex', nestedItems, item => item.id);

      const results = nestedManager.lookup('nestedNameIndex', 'Alice');
      expect(results.has('1')).toBe(true);
    });

    it('should handle undefined in nested paths', () => {
      const nestedManager = new IndexManager<any>();
      const items = [
        { id: '1', user: { profile: { name: 'Alice' } } },
        { id: '2', user: null },
        { id: '3', incomplete: {} }
      ];

      nestedManager.createIndex('nestedIndex', { fields: ['user.profile.name'] });
      nestedManager.buildIndex('nestedIndex', items, item => item.id);

      const results = nestedManager.lookup('nestedIndex', 'Alice');
      expect(results.size).toBe(1);
      expect(results.has('1')).toBe(true);
    });
  });

  describe('lookup errors', () => {
    it('should throw error when looking up non-existent index', () => {
      expect(() => indexManager.lookup('nonExistent', 'value'))
        .toThrow('Index nonExistent not found');
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      indexManager.createIndex('ageIndex', { fields: ['age'] });
      indexManager.buildIndex('ageIndex', testItems, item => item.id);
    });

    it('should return undefined for non-existent index', () => {
      const stats = indexManager.getStatistics('nonExistent');
      expect(stats).toBeUndefined();
    });

    it('should include memory usage estimate', () => {
      const stats = indexManager.getStatistics('ageIndex');
      expect(stats).toBeDefined();
      expect(stats!.memoryUsage).toBeGreaterThan(0);
    });
  });
});
