/**
 * Tests for FilterComposer
 */

import { FilterComposer, FilterHelpers } from '../filter.composer';

interface TestItem {
  id: number;
  name: string;
  age?: number;
  status: string;
  tags?: string[];
  metadata?: {
    created: string;
    score: number;
  };
}

describe('FilterComposer', () => {
  let composer: FilterComposer<TestItem>;
  let testData: TestItem[];

  beforeEach(() => {
    composer = new FilterComposer<TestItem>();
    testData = [
      { id: 1, name: 'Alice', age: 25, status: 'active', tags: ['admin', 'user'] },
      { id: 2, name: 'Bob', age: 30, status: 'inactive', tags: ['user'] },
      { id: 3, name: 'Charlie', age: 25, status: 'active', tags: ['moderator'] },
      { id: 4, name: 'David', status: 'pending', metadata: { created: '2025-01-01', score: 95 } },
      { id: 5, name: 'Eve', age: 35, status: 'active', metadata: { created: '2025-01-02', score: 85 } }
    ];
  });

  describe('Simple Equality', () => {
    it('should filter by exact match', () => {
      const result = composer.filter(testData, { status: 'active' });

      expect(result).toHaveLength(3);
      expect(result.every(item => item.status === 'active')).toBe(true);
    });

    it('should filter by number', () => {
      const result = composer.filter(testData, { age: 25 });

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
    });

    it('should handle no matches', () => {
      const result = composer.filter(testData, { status: 'nonexistent' });

      expect(result).toHaveLength(0);
    });
  });

  describe('Comparison Operators', () => {
    it('should filter with $gt', () => {
      const result = composer.filter(testData, {
        age: { $gt: 25 }
      });

      expect(result).toHaveLength(2);
      expect(result.every(item => item.age! > 25)).toBe(true);
    });

    it('should filter with $gte', () => {
      const result = composer.filter(testData, {
        age: { $gte: 25 }
      });

      expect(result).toHaveLength(4);
    });

    it('should filter with $lt', () => {
      const result = composer.filter(testData, {
        age: { $lt: 30 }
      });

      expect(result).toHaveLength(2);
    });

    it('should filter with $lte', () => {
      const result = composer.filter(testData, {
        age: { $lte: 30 }
      });

      expect(result).toHaveLength(3);
    });

    it('should filter with range ($gte and $lte)', () => {
      const result = composer.filter(testData, {
        age: { $gte: 25, $lte: 30 }
      });

      expect(result).toHaveLength(3);
    });
  });

  describe('Equality Operators', () => {
    it('should filter with $eq', () => {
      const result = composer.filter(testData, {
        status: { $eq: 'active' }
      });

      expect(result).toHaveLength(3);
    });

    it('should filter with $ne', () => {
      const result = composer.filter(testData, {
        status: { $ne: 'active' }
      });

      expect(result).toHaveLength(2);
      expect(result.every(item => item.status !== 'active')).toBe(true);
    });
  });

  describe('Array Operators', () => {
    it('should filter with $in', () => {
      const result = composer.filter(testData, {
        status: { $in: ['active', 'pending'] }
      });

      expect(result).toHaveLength(4);
    });

    it('should filter with $nin', () => {
      const result = composer.filter(testData, {
        status: { $nin: ['active', 'pending'] }
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('inactive');
    });
  });

  describe('Existence Operator', () => {
    it('should filter with $exists true', () => {
      const result = composer.filter(testData, {
        age: { $exists: true }
      });

      expect(result).toHaveLength(4);
    });

    it('should filter with $exists false', () => {
      const result = composer.filter(testData, {
        age: { $exists: false }
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('David');
    });
  });

  describe('Regex Operator', () => {
    it('should filter with string regex', () => {
      const result = composer.filter(testData, {
        name: { $regex: '^A' }
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
    });

    it('should filter with RegExp object', () => {
      const result = composer.filter(testData, {
        name: { $regex: /li/i }
      });

      expect(result).toHaveLength(2); // Alice and Charlie
    });
  });

  describe('Logical Operators', () => {
    it('should filter with $and', () => {
      const result = composer.filter(testData, {
        $and: [
          { status: 'active' },
          { age: { $gte: 30 } }
        ]
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Eve');
    });

    it('should filter with $or', () => {
      const result = composer.filter(testData, {
        $or: [
          { status: 'pending' },
          { age: { $lt: 26 } }
        ]
      } as any);

      expect(result).toHaveLength(3); // David, Alice, Charlie
    });

    it('should filter with $not', () => {
      const result = composer.filter(testData, {
        $not: { status: 'active' }
      } as any);

      expect(result).toHaveLength(2);
      expect(result.every(item => item.status !== 'active')).toBe(true);
    });
  });

  describe('Custom Function', () => {
    it('should filter with custom function', () => {
      const result = composer.filter(testData, {
        age: {
          $custom: (item) => item.age !== undefined && item.age % 5 === 0
        }
      });

      expect(result).toHaveLength(4); // Alice(25), Bob(30), Charlie(25), Eve(35)
      expect(result.every(item => item.age && item.age % 5 === 0)).toBe(true);
    });
  });

  describe('Nested Field Access', () => {
    it('should filter by nested field', () => {
      const result = composer.filter(testData, {
        'metadata.score': { $gte: 90 }
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('David');
    });
  });

  describe('Utility Methods', () => {
    it('matches should return true for matching item', () => {
      const item = testData[0];
      const result = composer.matches(item, { status: 'active' });

      expect(result).toBe(true);
    });

    it('matches should return false for non-matching item', () => {
      const item = testData[1];
      const result = composer.matches(item, { status: 'active' });

      expect(result).toBe(false);
    });

    it('count should return number of matches', () => {
      const count = composer.count(testData, { status: 'active' });

      expect(count).toBe(3);
    });

    it('findFirst should return first matching item', () => {
      const result = composer.findFirst(testData, { age: 25 });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Alice');
    });

    it('some should return true if any match', () => {
      const result = composer.some(testData, { status: 'pending' });

      expect(result).toBe(true);
    });

    it('every should return false if not all match', () => {
      const result = composer.every(testData, { status: 'active' });

      expect(result).toBe(false);
    });

    it('partition should split into matches and non-matches', () => {
      const [matches, nonMatches] = composer.partition(testData, { status: 'active' });

      expect(matches).toHaveLength(3);
      expect(nonMatches).toHaveLength(2);
    });
  });

  describe('FilterHelpers', () => {
    it('equals should create equality filter', () => {
      const filter = FilterHelpers.equals<TestItem>('status', 'active');
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(3);
    });

    it('range should create range filter', () => {
      const filter = FilterHelpers.range<TestItem>('age', 25, 30);
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(3);
    });

    it('textSearch should create regex filter', () => {
      const filter = FilterHelpers.textSearch<TestItem>('name', 'li', false);
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(2); // Alice, Charlie
    });

    it('oneOf should create $in filter', () => {
      const filter = FilterHelpers.oneOf<TestItem>('status', ['active', 'pending']);
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(4);
    });

    it('and should combine multiple filters', () => {
      const filter = FilterHelpers.and<TestItem>(
        { status: 'active' },
        { age: { $gte: 30 } } as any
      );
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(1);
    });

    it('or should create $or filter', () => {
      const filter = FilterHelpers.or<TestItem>(
        { status: 'pending' },
        { age: { $lt: 26 } } as any
      );
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(3);
    });

    it('not should create $not filter', () => {
      const filter = FilterHelpers.not<TestItem>({ status: 'active' });
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(2);
    });

    it('should handle nested $and with multiple conditions', () => {
      const filter = FilterHelpers.and<TestItem>(
        { status: 'active' },
        { age: { $gte: 30 } } as any
      );
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Eve');
    });

    it('should handle nested $or with complex conditions', () => {
      const filter = FilterHelpers.or<TestItem>(
        { age: 25 },
        { status: 'pending' }
      );
      const result = composer.filter(testData, filter);

      expect(result).toHaveLength(3); // Alice, Charlie, David
    });

    it('should handle $not with nested conditions', () => {
      const filter = FilterHelpers.not<TestItem>({
        $and: [{ status: 'active' }, { age: { $lt: 30 } }]
      } as any);
      const result = composer.filter(testData, filter);

      // Should exclude Alice and Charlie (active with age < 30)
      expect(result).toHaveLength(3);
    });
  });
});
