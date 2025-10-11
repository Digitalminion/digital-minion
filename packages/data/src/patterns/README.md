# Base Module - Generic Patterns & Utilities

Reusable base classes and utilities for implementing the **Repository** and **Manager** patterns, along with powerful query, sort, and pagination helpers.

## 📋 Overview

The Base Module provides:

- **BaseRepository** - Generic repository pattern for data persistence
- **BaseManager** - Generic manager pattern for business logic coordination
- **QueryBuilder** - Fluent API for building complex queries
- **Query/Sort/Pagination Helpers** - Utilities for common data operations
- **Type-safe interfaces** - Full TypeScript support with generics

## 🚀 Quick Start

### 1. BaseRepository - Data Persistence

```typescript
import { BaseRepository, BaseRepositoryConfig } from '@digital-minion/common';

interface TodoItem {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'complete';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

class TodoRepository extends BaseRepository<TodoItem> {
  constructor(basePath: string, namespace: string = 'core') {
    super({
      basePath: join(basePath, 'todo', 'lists'),
      collection: 'todos',
      namespace,
      useDataLayer: true,
      fileType: 'jsonl'
    });
  }

  protected getDataPath(): string {
    return join(this.config.basePath, this.config.namespace || 'default', 'todos.jsonl');
  }

  protected async validate(item: TodoItem): Promise<boolean> {
    if (!item.id || !item.title) {
      throw new Error('Todo must have id and title');
    }
    return true;
  }

  // Add domain-specific methods
  async getPendingTodos(): Promise<TodoItem[]> {
    return this.findAll({ status: 'pending' });
  }
}

// Usage
const repo = new TodoRepository('.minion', 'core');
await repo.initialize();

const todos = await repo.getPendingTodos();
```

### 2. BaseManager - Business Logic

```typescript
import { BaseManager, BaseManagerConfig, ValidationResult } from '@digital-minion/common';

class TodoManager extends BaseManager<TodoItem> {
  constructor(basePath: string, namespace: string = 'core') {
    const config: BaseManagerConfig = {
      basePath: join(basePath, 'todo', 'lists'),
      collection: 'todos',
      defaultNamespace: namespace,
      useDataLayer: true
    };

    const repository = new TodoRepository(basePath, namespace);
    super(config, repository);
  }

  protected async validate(item: TodoItem): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!item.title?.trim()) {
      errors.push('Title is required');
    }

    return { isValid: errors.length === 0, errors };
  }

  protected async discoverNamespaces(): Promise<void> {
    // Auto-discover partitions/namespaces
    this.availableNamespaces = ['core', 'local'];
  }

  protected async loadStats(): Promise<void> {
    this.stats.totalItems = await this.count();
  }

  // Lifecycle hooks
  protected async beforeCreate(item: TodoItem): Promise<TodoItem> {
    return {
      ...item,
      created_at: new Date().toISOString()
    };
  }

  protected async afterCreate(item: TodoItem): Promise<void> {
    console.log(`Todo created: ${item.id}`);
  }
}

// Usage
const manager = new TodoManager('.minion', 'core');
await manager.initialize();

const todo = await manager.createItem({
  title: 'New task',
  priority: 'high'
});
```

### 3. QueryBuilder - Fluent Queries

```typescript
import { QueryBuilder } from '@digital-minion/common';

const query = new QueryBuilder<TodoItem>()
  .where({ status: 'pending' })
  .where({ priority: { $in: ['high', 'medium'] } })
  .sortBy('created_at', 'desc')
  .limit(20)
  .offset(0)
  .partitions(['core', 'local'])
  .build();

const result = await repository.find(query);
```

### 4. Query Helpers - Filter Construction

```typescript
import { QueryHelpers } from '@digital-minion/common';

// Text search
const searchFilter = QueryHelpers.createTextSearchFilter(
  'bug fix',
  ['title', 'description']
);

// Date range
const dateFilter = QueryHelpers.createDateRangeFilter(
  'created_at',
  new Date('2025-01-01'),
  new Date('2025-12-31')
);

// Combine with AND/OR
const complexFilter = QueryHelpers.andFilters(
  QueryHelpers.orFilters(
    { priority: 'high' },
    { 'metadata.tags': { $in: ['urgent'] } }
  ),
  QueryHelpers.notFilter({ status: 'complete' })
);
```

### 5. Sort Helpers - Sorting Operations

```typescript
import { SortHelpers } from '@digital-minion/common';

// Sort by single field
const sorted = SortHelpers.sortBy(todos, 'priority', 'desc');

// Multi-field sort
const multiSorted = SortHelpers.sortByMultiple(todos, [
  { field: 'priority', direction: 'desc' },
  { field: 'created_at', direction: 'asc' }
]);
```

### 6. Pagination Helpers

```typescript
import { PaginationHelpers, QueryHelpers } from '@digital-minion/common';

// Paginate in memory
const page1 = PaginationHelpers.paginate(todos, 1, 10);
console.log(page1.pagination); // { page: 1, totalPages: 5, hasNext: true, ... }

// Convert pagination to query
const queryOpts = QueryHelpers.paginationToQuery({ page: 2, pageSize: 20 });

// Get page range for UI
const pageRange = PaginationHelpers.getPageRange(3, 10, 5); // [1, 2, 3, 4, 5]
```

## 📐 Architecture

### BaseRepository

**Responsibilities:**
- Data persistence (CRUD operations)
- Query execution
- DataLayer integration
- Legacy fallback support

**Key Methods:**
- `findAll(criteria?)` - Find all items
- `find(query)` - Query with pagination/sorting
- `findById(id)` - Find one by ID
- `create(items)` - Create item(s)
- `update(criteria, updates)` - Update items
- `delete(criteria)` - Delete items
- `count(criteria?)` - Count items

**Abstract Methods:**
- `getDataPath()` - Get file path for data
- `validate(item)` - Validate item

### BaseManager

**Responsibilities:**
- Business logic coordination
- Repository orchestration
- Cross-cutting concerns (validation, events)
- Namespace/partition management
- Lifecycle hooks

**Key Methods:**
- `createItem(item)` - Create with validation/hooks
- `updateItem(id, updates)` - Update with hooks
- `deleteItem(id)` - Delete with hooks
- `search(criteria)` - Search items
- `query(query)` - Advanced querying
- `getStats()` - Get statistics

**Abstract Methods:**
- `validate(item)` - Validate item
- `discoverNamespaces()` - Find namespaces
- `loadStats()` - Load statistics

**Lifecycle Hooks:**
- `beforeCreate(item)` - Pre-create processing
- `afterCreate(item)` - Post-create processing
- `beforeUpdate(id, updates)` - Pre-update processing
- `afterUpdate(item)` - Post-update processing
- `beforeDelete(id)` - Pre-delete processing
- `afterDelete(id)` - Post-delete processing

## 🎯 Features

### 1. DataLayer Integration

Both BaseRepository and BaseManager integrate seamlessly with the DataLayer:

```typescript
// Automatic caching, indexing, parallel processing
const repo = new TodoRepository('.minion', 'core');
await repo.initialize(); // DataLayer auto-initialized

// Fast queries with caching
const todos = await repo.findAll({ status: 'pending' });
```

### 2. Legacy Fallback

Graceful degradation when DataLayer is not available:

```typescript
const repo = new TodoRepository('.minion', 'core');
// If DataLayer fails, falls back to direct file operations
```

### 3. Type Safety

Full TypeScript support with generics:

```typescript
class MyRepository extends BaseRepository<MyType> {
  // All methods are type-safe with MyType
}
```

### 4. Query Operators

Support for MongoDB-style operators:

- `$eq`, `$ne` - Equality
- `$gt`, `$gte`, `$lt`, `$lte` - Comparison
- `$in`, `$nin` - Array membership
- `$exists` - Field existence
- `$regex` - Pattern matching
- `$and`, `$or`, `$not` - Logical operators

### 5. Flexible Configuration

```typescript
const config: BaseRepositoryConfig = {
  basePath: '.minion/todo/lists',
  collection: 'todos',
  namespace: 'core',
  useDataLayer: true,    // Enable DataLayer
  fileType: 'jsonl'      // or 'json'
};
```

## 📊 Query Interfaces

### QueryOptions

```typescript
interface QueryOptions<T> {
  limit?: number;
  offset?: number;
  sortBy?: keyof T | string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
  partitions?: string[];
}
```

### PaginationOptions

```typescript
interface PaginationOptions {
  page?: number;
  pageSize?: number;
}
```

### QueryResult

```typescript
interface QueryResult<T> {
  data: T[];
  metadata: {
    totalCount: number;
    returnedCount: number;
    offset?: number;
    limit?: number;
    hasMore?: boolean;
  };
}
```

### PaginatedResult

```typescript
interface PaginatedResult<T> {
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
```

## 🔧 Utility Classes

### QueryBuilder

Fluent API for building queries:

```typescript
const query = new QueryBuilder<TodoItem>()
  .where({ status: 'pending' })
  .sortBy('priority', 'desc')
  .limit(20)
  .build();
```

### QueryHelpers

Filter construction utilities:

- `createTextSearchFilter(query, fields, caseSensitive?)`
- `createRangeFilter(field, min?, max?)`
- `createDateRangeFilter(field, start?, end?)`
- `createInFilter(field, values)`
- `createExistsFilter(field, exists?)`
- `andFilters(...filters)`
- `orFilters(...filters)`
- `notFilter(filter)`

### SortHelpers

Sorting utilities:

- `sortBy(items, field, direction?)`
- `sortByMultiple(items, sorts)`
- `createComparator(field, direction?)`
- `createMultiComparator(sorts)`

### PaginationHelpers

Pagination utilities:

- `paginate(items, page, pageSize)`
- `getPageInfo(totalItems, page, pageSize)`
- `getPageRange(currentPage, totalPages, maxVisible)`

## 📚 Examples

See the `examples/` directory for complete examples:

- **base-repository.example.ts** - Repository pattern usage
- **base-manager.example.ts** - Manager pattern usage
- **query-utilities.example.ts** - Query/sort/pagination utilities

## 🎓 Migration Guide

### From Domain-Specific Repository

**Before:**
```typescript
class TodoRepository {
  async getPendingTodos(): Promise<TodoItem[]> {
    const path = this.getPath();
    const data = await this.fileJSON.readFile(path);
    return data.filter(item => item.status === 'pending');
  }
}
```

**After:**
```typescript
class TodoRepository extends BaseRepository<TodoItem> {
  async getPendingTodos(): Promise<TodoItem[]> {
    return this.findAll({ status: 'pending' });
  }
}
```

**Benefits:**
- ✅ Automatic DataLayer integration (caching, indexing, parallel processing)
- ✅ Type-safe queries
- ✅ Legacy fallback
- ✅ Built-in CRUD operations
- ✅ Statistics tracking

### From Domain-Specific Manager

**Before:**
```typescript
class TodoManager {
  async createTodo(data: Partial<TodoItem>): Promise<TodoItem> {
    const todo = { ...data, id: this.generateId(), created_at: new Date().toISOString() };
    await this.repository.save(todo);
    return todo;
  }
}
```

**After:**
```typescript
class TodoManager extends BaseManager<TodoItem> {
  protected async beforeCreate(item: TodoItem): Promise<TodoItem> {
    return { ...item, created_at: new Date().toISOString() };
  }
}
```

**Benefits:**
- ✅ Lifecycle hooks
- ✅ Validation framework
- ✅ Statistics tracking
- ✅ Namespace management
- ✅ Built-in CRUD with hooks

## 🔌 Integration with DataLayer

The Base Module integrates seamlessly with the DataLayer for enhanced performance:

```typescript
// Repository with DataLayer
const repo = new TodoRepository('.minion', 'core');
await repo.initialize(); // Auto-initializes DataLayer

// Queries use DataLayer (with caching, indexing, parallel processing)
const todos = await repo.findAll({ status: 'pending' });

// Manager with DataLayer
const manager = new TodoManager('.minion', 'core');
await manager.initialize(); // Auto-initializes DataLayer

// Cross-partition queries
const allTodos = await manager.query({
  filters: { status: 'pending' },
  partitions: ['core', 'local']
});
```

## 📈 Performance

| Operation | Without Base Module | With Base Module | Improvement |
|-----------|-------------------|-----------------|-------------|
| **Simple Query** | Manual filtering | DataLayer cached | **10-100x faster** |
| **Complex Query** | Nested loops | MongoDB-style filters | **More readable** |
| **Sorting** | Manual sort logic | SortHelpers | **Reusable** |
| **Pagination** | Manual slicing | PaginationHelpers | **Type-safe** |
| **Validation** | Scattered checks | Centralized validate() | **Consistent** |

## ✅ Best Practices

1. **Extend, don't modify** - Always extend BaseRepository/BaseManager
2. **Use lifecycle hooks** - Implement beforeCreate/afterCreate for cross-cutting concerns
3. **Leverage DataLayer** - Set `useDataLayer: true` for performance
4. **Type your domain** - Use TypeScript generics for type safety
5. **Validate early** - Implement validate() method thoroughly
6. **Use QueryBuilder** - Build complex queries fluently
7. **Namespace properly** - Organize data with meaningful namespaces

---

**That's it! You're ready to use the Base Module.** 🎉
