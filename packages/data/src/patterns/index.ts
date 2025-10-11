/**
 * Patterns Module - Generic base classes and utilities
 *
 * Provides reusable base classes for repository and manager patterns,
 * along with query, sort, and pagination utilities.
 */

// Base classes
export * from './base.repository';
export * from './base.manager';

// Query types and interfaces (re-exported with aliases to avoid conflicts)
export type {
  QueryOptions,
  PaginationOptions,
  SortOptions,
  SearchOptions,
  IQueryable,
  IPageable,
  ISortable
} from './query.types';

export type {
  QueryResult as PatternQueryResult,
  PaginatedResult
} from './query.types';

// Query utilities
export * from './query.helpers';
