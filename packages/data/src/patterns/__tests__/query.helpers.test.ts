/**
 * Tests for QueryHelpers and QueryBuilder
 */

import { QueryBuilder, QueryHelpers, SortHelpers, PaginationHelpers } from '../query.helpers';

describe('QueryBuilder', () => {
  let builder: QueryBuilder<any>;

  beforeEach(() => {
    builder = new QueryBuilder();
  });

  it('should set limit', () => {
    const options = builder.limit(10).build();
    expect(options.limit).toBe(10);
  });

  it('should set offset', () => {
    const options = builder.offset(5).build();
    expect(options.offset).toBe(5);
  });

  it('should set sortBy with default ascending order', () => {
    const options = builder.sortBy('name').build();
    expect(options.sortBy).toBe('name');
    expect(options.sortOrder).toBe('asc');
  });

  it('should set sortBy with descending order', () => {
    const options = builder.sortBy('date', 'desc').build();
    expect(options.sortBy).toBe('date');
    expect(options.sortOrder).toBe('desc');
  });

  it('should set filter', () => {
    const options = builder.where({ status: 'active' }).build();
    expect(options.filter).toEqual({ status: 'active' });
  });

  it('should merge multiple filters', () => {
    const options = builder
      .where({ status: 'active' })
      .where({ type: 'premium' })
      .build();
    expect(options.filter).toEqual({ status: 'active', type: 'premium' });
  });

  it('should set partitions', () => {
    const options = builder.partitions(['p1', 'p2']).build();
    expect(options.partitions).toEqual(['p1', 'p2']);
  });

  it('should chain multiple operations', () => {
    const options = builder
      .limit(20)
      .offset(10)
      .sortBy('created', 'desc')
      .where({ active: true })
      .partitions(['main'])
      .build();

    expect(options).toEqual({
      limit: 20,
      offset: 10,
      sortBy: 'created',
      sortOrder: 'desc',
      filter: { active: true },
      partitions: ['main']
    });
  });

  it('should reset builder', () => {
    builder.limit(10).offset(5).sortBy('name');
    builder.reset();
    const options = builder.build();
    expect(options).toEqual({});
  });
});

describe('QueryHelpers', () => {
  describe('paginationToQuery', () => {
    it('should convert pagination to query options', () => {
      const query = QueryHelpers.paginationToQuery({ page: 2, pageSize: 20 });
      expect(query).toEqual({ limit: 20, offset: 20 });
    });

    it('should use defaults for missing values', () => {
      const query = QueryHelpers.paginationToQuery({});
      expect(query).toEqual({ limit: 10, offset: 0 });
    });

    it('should handle page 1', () => {
      const query = QueryHelpers.paginationToQuery({ page: 1, pageSize: 15 });
      expect(query).toEqual({ limit: 15, offset: 0 });
    });
  });

  describe('toPaginatedResult', () => {
    it('should convert query result to paginated result', () => {
      const queryResult = {
        data: [1, 2, 3],
        metadata: {
          totalCount: 100,
          partitionCount: 5,
          executionTime: 50
        }
      };

      const paginated = QueryHelpers.toPaginatedResult(queryResult, { page: 2, pageSize: 10 });

      expect(paginated.data).toEqual([1, 2, 3]);
      expect(paginated.pagination.page).toBe(2);
      expect(paginated.pagination.pageSize).toBe(10);
      expect(paginated.pagination.totalPages).toBe(10);
      expect(paginated.pagination.totalItems).toBe(100);
      expect(paginated.pagination.hasNext).toBe(true);
      expect(paginated.pagination.hasPrevious).toBe(true);
    });

    it('should detect no next page', () => {
      const queryResult = {
        data: [1],
        metadata: { totalCount: 21, partitionCount: 1, executionTime: 10 }
      };

      const paginated = QueryHelpers.toPaginatedResult(queryResult, { page: 3, pageSize: 10 });

      expect(paginated.pagination.hasNext).toBe(false);
      expect(paginated.pagination.hasPrevious).toBe(true);
    });

    it('should detect first page', () => {
      const queryResult = {
        data: [1],
        metadata: { totalCount: 50, partitionCount: 1, executionTime: 10 }
      };

      const paginated = QueryHelpers.toPaginatedResult(queryResult, { page: 1, pageSize: 10 });

      expect(paginated.pagination.hasNext).toBe(true);
      expect(paginated.pagination.hasPrevious).toBe(false);
    });
  });

  describe('sortBy', () => {
    it('should sort ascending', () => {
      const data = [{ age: 30 }, { age: 20 }, { age: 25 }];
      const sorted = SortHelpers.sortBy(data, 'age', 'asc');
      expect(sorted.map(d => d.age)).toEqual([20, 25, 30]);
    });

    it('should sort descending', () => {
      const data = [{ age: 30 }, { age: 20 }, { age: 25 }];
      const sorted = SortHelpers.sortBy(data, 'age', 'desc');
      expect(sorted.map(d => d.age)).toEqual([30, 25, 20]);
    });
  });

  describe('paginate', () => {
    it('should paginate data', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const paginated = PaginationHelpers.paginate(data, 2, 3);
      expect(paginated.data).toEqual([4, 5, 6]);
      expect(paginated.pagination.page).toBe(2);
      expect(paginated.pagination.totalPages).toBe(4);
    });

    it('should handle first page', () => {
      const data = [1, 2, 3, 4, 5];
      const paginated = PaginationHelpers.paginate(data, 1, 2);
      expect(paginated.data).toEqual([1, 2]);
    });
  });

  describe('mergeFilters', () => {
    it('should merge multiple filters', () => {
      const merged = QueryHelpers.mergeFilters(
        { status: 'active' },
        { type: 'premium' },
        { verified: true }
      );
      expect(merged).toEqual({ status: 'active', type: 'premium', verified: true });
    });
  });

  describe('createTextSearchFilter', () => {
    it('should create regex filter', () => {
      const filter = QueryHelpers.createTextSearchFilter('john', ['name', 'username']);
      expect(filter).toHaveProperty('$or');
      expect(filter.$or).toHaveLength(2);
    });
  });

  describe('createRangeFilter', () => {
    it('should create range filter with min and max', () => {
      const filter = QueryHelpers.createRangeFilter('age', 18, 65);
      expect(filter).toEqual({ age: { $gte: 18, $lte: 65 } });
    });

    it('should create filter with only min', () => {
      const filter = QueryHelpers.createRangeFilter('age', 18);
      expect(filter).toEqual({ age: { $gte: 18 } });
    });

    it('should create filter with only max', () => {
      const filter = QueryHelpers.createRangeFilter('age', undefined, 65);
      expect(filter).toEqual({ age: { $lte: 65 } });
    });
  });

  describe('createDateRangeFilter', () => {
    it('should create date range filter with Date objects', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const filter = QueryHelpers.createDateRangeFilter('createdAt', start, end);

      expect(filter).toHaveProperty('createdAt');
      expect(filter.createdAt.$gte).toBe(start.toISOString());
      expect(filter.createdAt.$lte).toBe(end.toISOString());
    });

    it('should create date range filter with strings', () => {
      const filter = QueryHelpers.createDateRangeFilter('createdAt', '2024-01-01', '2024-12-31');

      expect(filter).toHaveProperty('createdAt');
      expect(filter.createdAt.$gte).toBe('2024-01-01');
      expect(filter.createdAt.$lte).toBe('2024-12-31');
    });

    it('should handle only start date', () => {
      const start = new Date('2024-01-01');
      const filter = QueryHelpers.createDateRangeFilter('createdAt', start);

      expect(filter.createdAt.$gte).toBe(start.toISOString());
      expect(filter.createdAt.$lte).toBeUndefined();
    });

    it('should handle only end date', () => {
      const end = new Date('2024-12-31');
      const filter = QueryHelpers.createDateRangeFilter('createdAt', undefined, end);

      expect(filter.createdAt.$gte).toBeUndefined();
      expect(filter.createdAt.$lte).toBe(end.toISOString());
    });
  });

  describe('createInFilter', () => {
    it('should create in filter', () => {
      const filter = QueryHelpers.createInFilter('status', ['active', 'pending']);

      expect(filter).toEqual({
        status: { $in: ['active', 'pending'] }
      });
    });

    it('should handle empty array', () => {
      const filter = QueryHelpers.createInFilter('status', []);

      expect(filter).toEqual({
        status: { $in: [] }
      });
    });
  });

  describe('createNotInFilter', () => {
    it('should create not in filter', () => {
      const filter = QueryHelpers.createNotInFilter('status', ['deleted', 'archived']);

      expect(filter).toEqual({
        status: { $nin: ['deleted', 'archived'] }
      });
    });
  });

  describe('createExistsFilter', () => {
    it('should create exists filter with true', () => {
      const filter = QueryHelpers.createExistsFilter('email', true);

      expect(filter).toEqual({
        email: { $exists: true }
      });
    });

    it('should create exists filter with false', () => {
      const filter = QueryHelpers.createExistsFilter('deletedAt', false);

      expect(filter).toEqual({
        deletedAt: { $exists: false }
      });
    });

    it('should default to true when not specified', () => {
      const filter = QueryHelpers.createExistsFilter('email');

      expect(filter).toEqual({
        email: { $exists: true }
      });
    });
  });

  describe('andFilters', () => {
    it('should combine filters with AND logic', () => {
      const filter = QueryHelpers.andFilters(
        { status: 'active' },
        { verified: true }
      );
      expect(filter).toEqual({ $and: [{ status: 'active' }, { verified: true }] });
    });

    it('should handle single filter', () => {
      const filter = QueryHelpers.andFilters({ status: 'active' });
      expect(filter).toEqual({ status: 'active' });
    });
  });

  describe('orFilters', () => {
    it('should combine filters with OR logic', () => {
      const filter = QueryHelpers.orFilters(
        { status: 'active' },
        { status: 'pending' }
      );
      expect(filter).toEqual({ $or: [{ status: 'active' }, { status: 'pending' }] });
    });
  });

  describe('SortHelpers', () => {
    it('should create sort comparator', () => {
      const items = [{ age: 30 }, { age: 20 }, { age: 25 }];
      const comparator = SortHelpers.createComparator('age', 'asc');

      const sorted = [...items].sort(comparator);
      expect(sorted.map(i => i.age)).toEqual([20, 25, 30]);
    });
  });

  describe('PaginationHelpers', () => {
    it('should get page info', () => {
      const info = PaginationHelpers.getPageInfo(100, 2, 10);

      expect(info.page).toBe(2);
      expect(info.totalPages).toBe(10);
      expect(info.hasNext).toBe(true);
      expect(info.hasPrevious).toBe(true);
    });

    it('should get page range', () => {
      const range = PaginationHelpers.getPageRange(5, 10, 5);

      expect(range).toHaveLength(5);
      expect(range).toContain(5);
    });
  });
});
