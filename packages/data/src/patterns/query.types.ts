/**
 * Query Types - Common query interfaces and types
 *
 * Provides standardized query capabilities across all managers and repositories.
 */

export interface QueryOptions<T = any> {
  limit?: number;
  offset?: number;
  sortBy?: keyof T | string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
  partitions?: string[];
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface SortOptions<T = any> {
  field: keyof T | string;
  direction?: 'asc' | 'desc';
}

export interface SearchOptions<T = any> extends QueryOptions<T> {
  fields?: (keyof T | string)[];
  caseSensitive?: boolean;
  exact?: boolean;
}

export interface QueryResult<T> {
  data: T[];
  metadata: {
    totalCount: number;
    returnedCount: number;
    offset?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Interface for queryable objects
 */
export interface IQueryable<T> {
  /**
   * Query items with options
   */
  query(options?: QueryOptions<T>): Promise<QueryResult<T>>;

  /**
   * Search items by text
   */
  search(query: string, options?: SearchOptions<T>): Promise<T[]>;

  /**
   * Filter items by criteria
   */
  filter(criteria: Record<string, any>, options?: QueryOptions<T>): Promise<T[]>;

  /**
   * Get count of items matching criteria
   */
  count(criteria?: Record<string, any>): Promise<number>;
}

/**
 * Interface for pageable objects
 */
export interface IPageable<T> {
  /**
   * Get paginated results
   */
  paginate(options: PaginationOptions): Promise<PaginatedResult<T>>;

  /**
   * Get next page
   */
  nextPage(currentPage: number, pageSize: number): Promise<PaginatedResult<T>>;

  /**
   * Get previous page
   */
  previousPage(currentPage: number, pageSize: number): Promise<PaginatedResult<T>>;
}

/**
 * Interface for sortable objects
 */
export interface ISortable<T> {
  /**
   * Sort items by field
   */
  sortBy(field: keyof T | string, direction?: 'asc' | 'desc'): Promise<T[]>;

  /**
   * Sort items by multiple fields
   */
  sortByMultiple(sorts: SortOptions<T>[]): Promise<T[]>;
}
