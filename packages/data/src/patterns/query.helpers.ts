/**
 * Query Helpers - Utility functions for query operations
 *
 * Provides reusable query building, filtering, and transformation utilities.
 */

import { QueryOptions, QueryResult, PaginatedResult, PaginationOptions, SortOptions } from './query.types';

/**
 * Query Builder for fluent query construction
 */
export class QueryBuilder<T> {
  private options: QueryOptions<T> = {};

  /**
   * Set limit
   */
  limit(limit: number): this {
    this.options.limit = limit;
    return this;
  }

  /**
   * Set offset
   */
  offset(offset: number): this {
    this.options.offset = offset;
    return this;
  }

  /**
   * Set sorting
   */
  sortBy(field: keyof T | string, direction: 'asc' | 'desc' = 'asc'): this {
    this.options.sortBy = field as string;
    this.options.sortOrder = direction;
    return this;
  }

  /**
   * Set filter
   */
  where(filter: Record<string, any>): this {
    this.options.filter = { ...this.options.filter, ...filter };
    return this;
  }

  /**
   * Set partitions
   */
  partitions(partitions: string[]): this {
    this.options.partitions = partitions;
    return this;
  }

  /**
   * Build query options
   */
  build(): QueryOptions<T> {
    return { ...this.options };
  }

  /**
   * Reset builder
   */
  reset(): this {
    this.options = {};
    return this;
  }
}

/**
 * Query Utilities
 */
export class QueryHelpers {
  /**
   * Convert pagination options to query options
   */
  static paginationToQuery<T>(pagination: PaginationOptions): QueryOptions<T> {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;

    return {
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
  }

  /**
   * Convert query result to paginated result
   */
  static toPaginatedResult<T>(
    result: QueryResult<T>,
    pagination: PaginationOptions
  ): PaginatedResult<T> {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const totalPages = Math.ceil(result.metadata.totalCount / pageSize);

    return {
      data: result.data,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems: result.metadata.totalCount,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }

  /**
   * Merge multiple filters
   */
  static mergeFilters(...filters: Record<string, any>[]): Record<string, any> {
    return Object.assign({}, ...filters);
  }

  /**
   * Create filter from search text
   */
  static createTextSearchFilter<T>(
    query: string,
    fields: (keyof T | string)[],
    caseSensitive: boolean = false
  ): Record<string, any> {
    const searchValue = caseSensitive ? query : query.toLowerCase();
    const regex = new RegExp(searchValue, caseSensitive ? '' : 'i');

    return {
      $or: fields.map(field => ({
        [field]: { $regex: regex }
      }))
    };
  }

  /**
   * Create range filter
   */
  static createRangeFilter<T>(
    field: keyof T | string,
    min?: any,
    max?: any
  ): Record<string, any> {
    const filter: Record<string, any> = {};

    if (min !== undefined) {
      filter[field as string] = { $gte: min };
    }

    if (max !== undefined) {
      const existing = filter[field as string] || {};
      filter[field as string] = {
        ...existing,
        $lte: max
      };
    }

    return filter;
  }

  /**
   * Create date range filter
   */
  static createDateRangeFilter<T>(
    field: keyof T | string,
    startDate?: Date | string,
    endDate?: Date | string
  ): Record<string, any> {
    const start = startDate instanceof Date ? startDate.toISOString() : startDate;
    const end = endDate instanceof Date ? endDate.toISOString() : endDate;

    return this.createRangeFilter(field, start, end);
  }

  /**
   * Create "in" filter
   */
  static createInFilter<T>(
    field: keyof T | string,
    values: any[]
  ): Record<string, any> {
    return {
      [field]: { $in: values }
    };
  }

  /**
   * Create "not in" filter
   */
  static createNotInFilter<T>(
    field: keyof T | string,
    values: any[]
  ): Record<string, any> {
    return {
      [field]: { $nin: values }
    };
  }

  /**
   * Create "exists" filter
   */
  static createExistsFilter<T>(
    field: keyof T | string,
    exists: boolean = true
  ): Record<string, any> {
    return {
      [field]: { $exists: exists }
    };
  }

  /**
   * Combine filters with AND logic
   */
  static andFilters(...filters: Record<string, any>[]): Record<string, any> {
    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0] || {};

    return {
      $and: filters
    };
  }

  /**
   * Combine filters with OR logic
   */
  static orFilters(...filters: Record<string, any>[]): Record<string, any> {
    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0] || {};

    return {
      $or: filters
    };
  }

  /**
   * Negate filter
   */
  static notFilter(filter: Record<string, any>): Record<string, any> {
    return {
      $not: filter
    };
  }
}

/**
 * Sort Utilities
 */
export class SortHelpers {
  /**
   * Create sort comparator function
   */
  static createComparator<T>(
    field: keyof T | string,
    direction: 'asc' | 'desc' = 'asc'
  ): (a: T, b: T) => number {
    return (a: T, b: T) => {
      const aValue = (a as any)[field];
      const bValue = (b as any)[field];

      if (aValue === bValue) return 0;

      const result = aValue < bValue ? -1 : 1;
      return direction === 'asc' ? result : -result;
    };
  }

  /**
   * Create multi-field sort comparator
   */
  static createMultiComparator<T>(
    sorts: SortOptions<T>[]
  ): (a: T, b: T) => number {
    return (a: T, b: T) => {
      for (const sort of sorts) {
        const comparator = this.createComparator(
          sort.field,
          sort.direction || 'asc'
        );
        const result = comparator(a, b);

        if (result !== 0) return result;
      }

      return 0;
    };
  }

  /**
   * Sort items by field
   */
  static sortBy<T>(
    items: T[],
    field: keyof T | string,
    direction: 'asc' | 'desc' = 'asc'
  ): T[] {
    return [...items].sort(this.createComparator(field, direction));
  }

  /**
   * Sort items by multiple fields
   */
  static sortByMultiple<T>(
    items: T[],
    sorts: SortOptions<T>[]
  ): T[] {
    return [...items].sort(this.createMultiComparator(sorts));
  }
}

/**
 * Pagination Utilities
 */
export class PaginationHelpers {
  /**
   * Paginate items in memory
   */
  static paginate<T>(
    items: T[],
    page: number = 1,
    pageSize: number = 10
  ): PaginatedResult<T> {
    const offset = (page - 1) * pageSize;
    const paginatedItems = items.slice(offset, offset + pageSize);
    const totalPages = Math.ceil(items.length / pageSize);

    return {
      data: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems: items.length,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }

  /**
   * Get page info without data
   */
  static getPageInfo(
    totalItems: number,
    page: number = 1,
    pageSize: number = 10
  ) {
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      page,
      pageSize,
      totalPages,
      totalItems,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  /**
   * Calculate page range for pagination controls
   */
  static getPageRange(
    currentPage: number,
    totalPages: number,
    maxVisible: number = 5
  ): number[] {
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const range: number[] = [];
    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  }
}
