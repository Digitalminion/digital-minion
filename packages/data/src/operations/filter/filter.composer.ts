/**
 * Filter Composition System
 *
 * Provides functional filter composition with:
 * - MongoDB-style query operators
 * - Composable filter functions
 * - Type-safe filtering
 * - Performance optimization
 */

import { FilterCriteria, FilterOperator } from '../../layer/data.types';

/**
 * Filter Composer for functional filter composition
 */
export class FilterComposer<T = any> {
  /**
   * Create filter function from criteria
   */
  createFilter(criteria: FilterCriteria<T>): (item: T) => boolean {
    const filters = this.compileFilters(criteria);

    return (item: T) => {
      return filters.every(filter => filter(item));
    };
  }

  /**
   * Compile filter criteria into filter functions
   */
  private compileFilters(criteria: FilterCriteria<T>): Array<(item: T) => boolean> {
    const filters: Array<(item: T) => boolean> = [];

    for (const [field, value] of Object.entries(criteria)) {
      // Handle top-level logical operators
      if (field === '$and' && Array.isArray(value)) {
        const andFilters = value.map(c => this.createFilter(c as unknown as FilterCriteria<T>));
        filters.push((item: T) => andFilters.every(fn => fn(item)));
      } else if (field === '$or' && Array.isArray(value)) {
        const orFilters = value.map(c => this.createFilter(c as unknown as FilterCriteria<T>));
        filters.push((item: T) => orFilters.some(fn => fn(item)));
      } else if (field === '$not') {
        const notFilter = this.createFilter(value as unknown as FilterCriteria<T>);
        filters.push((item: T) => !notFilter(item));
      } else if (this.isOperator(value)) {
        filters.push(this.compileOperator(field, value as FilterOperator<T>));
      } else {
        // Simple equality check
        filters.push((item: T) => this.getFieldValue(item, field) === value);
      }
    }

    return filters;
  }

  /**
   * Compile operator into filter function
   */
  private compileOperator(field: string, operator: FilterOperator<T>): (item: T) => boolean {
    const filterFns: Array<(item: T) => boolean> = [];

    // Equality operators
    if (operator.$eq !== undefined) {
      filterFns.push((item: T) => this.getFieldValue(item, field) === operator.$eq);
    }

    if (operator.$ne !== undefined) {
      filterFns.push((item: T) => this.getFieldValue(item, field) !== operator.$ne);
    }

    // Comparison operators
    if (operator.$gt !== undefined) {
      filterFns.push((item: T) => this.getFieldValue(item, field) > operator.$gt);
    }

    if (operator.$gte !== undefined) {
      filterFns.push((item: T) => this.getFieldValue(item, field) >= operator.$gte);
    }

    if (operator.$lt !== undefined) {
      filterFns.push((item: T) => this.getFieldValue(item, field) < operator.$lt);
    }

    if (operator.$lte !== undefined) {
      filterFns.push((item: T) => this.getFieldValue(item, field) <= operator.$lte);
    }

    // Array operators
    if (operator.$in !== undefined) {
      filterFns.push((item: T) => operator.$in!.includes(this.getFieldValue(item, field)));
    }

    if (operator.$nin !== undefined) {
      filterFns.push((item: T) => !operator.$nin!.includes(this.getFieldValue(item, field)));
    }

    // Existence operator
    if (operator.$exists !== undefined) {
      filterFns.push((item: T) => {
        const value = this.getFieldValue(item, field);
        const exists = value !== undefined && value !== null;
        return operator.$exists ? exists : !exists;
      });
    }

    // Regex operator
    if (operator.$regex !== undefined) {
      const regex = typeof operator.$regex === 'string'
        ? new RegExp(operator.$regex)
        : operator.$regex;

      filterFns.push((item: T) => {
        const value = this.getFieldValue(item, field);
        return typeof value === 'string' && regex.test(value);
      });
    }

    // Logical operators
    if (operator.$and) {
      const andFilters = operator.$and.map(criteria => this.createFilter(criteria));
      filterFns.push((item: T) => andFilters.every(fn => fn(item)));
    }

    if (operator.$or) {
      const orFilters = operator.$or.map(criteria => this.createFilter(criteria));
      filterFns.push((item: T) => orFilters.some(fn => fn(item)));
    }

    if (operator.$not) {
      const notFilter = this.createFilter(operator.$not);
      filterFns.push((item: T) => !notFilter(item));
    }

    // Custom function
    if (operator.$custom) {
      filterFns.push(operator.$custom);
    }

    // Combine all filter functions (AND logic)
    return (item: T) => filterFns.every(fn => fn(item));
  }

  /**
   * Apply filter to array
   */
  filter(items: T[], criteria: FilterCriteria<T>): T[] {
    const filterFn = this.createFilter(criteria);
    return items.filter(filterFn);
  }

  /**
   * Check if single item matches criteria
   */
  matches(item: T, criteria: FilterCriteria<T>): boolean {
    const filterFn = this.createFilter(criteria);
    return filterFn(item);
  }

  /**
   * Count items matching criteria
   */
  count(items: T[], criteria: FilterCriteria<T>): number {
    return this.filter(items, criteria).length;
  }

  /**
   * Find first item matching criteria
   */
  findFirst(items: T[], criteria: FilterCriteria<T>): T | undefined {
    const filterFn = this.createFilter(criteria);
    return items.find(filterFn);
  }

  /**
   * Check if any item matches criteria
   */
  some(items: T[], criteria: FilterCriteria<T>): boolean {
    const filterFn = this.createFilter(criteria);
    return items.some(filterFn);
  }

  /**
   * Check if all items match criteria
   */
  every(items: T[], criteria: FilterCriteria<T>): boolean {
    const filterFn = this.createFilter(criteria);
    return items.every(filterFn);
  }

  /**
   * Partition items into matches and non-matches
   */
  partition(items: T[], criteria: FilterCriteria<T>): [T[], T[]] {
    const filterFn = this.createFilter(criteria);
    const matches: T[] = [];
    const nonMatches: T[] = [];

    for (const item of items) {
      if (filterFn(item)) {
        matches.push(item);
      } else {
        nonMatches.push(item);
      }
    }

    return [matches, nonMatches];
  }

  /**
   * Get field value from object (supports nested paths)
   */
  private getFieldValue(obj: any, path: string): any {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Check if value is an operator object
   */
  private isOperator(value: any): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const keys = Object.keys(value);
    return keys.some(key => key.startsWith('$'));
  }
}

/**
 * Helper functions for creating filters
 */
export const FilterHelpers = {
  /**
   * Create equality filter
   */
  equals: <T>(field: keyof T, value: any): FilterCriteria<T> => ({
    [field]: value
  } as FilterCriteria<T>),

  /**
   * Create range filter
   */
  range: <T>(field: keyof T, min?: any, max?: any): FilterCriteria<T> => {
    const filter: any = {};
    if (min !== undefined) filter.$gte = min;
    if (max !== undefined) filter.$lte = max;
    return { [field]: filter } as FilterCriteria<T>;
  },

  /**
   * Create text search filter
   */
  textSearch: <T>(field: keyof T, query: string, caseSensitive = false): FilterCriteria<T> => ({
    [field]: {
      $regex: caseSensitive ? query : new RegExp(query, 'i')
    }
  } as FilterCriteria<T>),

  /**
   * Create in-array filter
   */
  oneOf: <T>(field: keyof T, values: any[]): FilterCriteria<T> => ({
    [field]: { $in: values }
  } as FilterCriteria<T>),

  /**
   * Create AND filter
   */
  and: <T>(...filters: FilterCriteria<T>[]): FilterCriteria<T> => ({
    $and: filters
  } as any),

  /**
   * Create OR filter
   */
  or: <T>(...filters: FilterCriteria<T>[]): FilterCriteria<T> => ({
    $or: filters
  } as any),

  /**
   * Create NOT filter
   */
  not: <T>(filter: FilterCriteria<T>): FilterCriteria<T> => ({
    $not: filter
  } as any)
};
