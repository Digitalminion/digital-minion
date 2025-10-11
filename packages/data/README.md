# @digital-minion/data

Comprehensive data storage and management system for Digital Minion.

## Overview

This package provides a complete data infrastructure with:
- **JSON Storage** - Reliable object and row-based JSON storage
- **Namespace System** - Hierarchical partition management with metadata
- **RowId System** - Partition-aware composite keys for O(1) lookups
- **Data Layer** - Advanced data operations (map-reduce, caching, streaming)
- **Patterns** - Repository and Manager patterns for domain logic

## Features

### Storage Layer

#### JSON Object Storage
```typescript
import { JsonObjectStorage } from '@digital-minion/data';

const storage = new JsonObjectStorage();

// Write config file
await storage.write('config.json', { setting: 'value' }, { pretty: true });

// Read config
const config = await storage.read('config.json');

// Update config
await storage.update('config.json', { newSetting: 'newValue' });
```

#### JSONL Row Storage
```typescript
import { JsonlRowStorage } from '@digital-minion/data';

const storage = new JsonlRowStorage();

// Append rows
await storage.appendRow('logs.jsonl', { level: 'info', message: 'Started' });
await storage.appendRows('logs.jsonl', logs);

// Read all rows
const rows = await storage.readAll('logs.jsonl');

// Read with pagination
const page = await storage.read('logs.jsonl', 0, 100);

// Stream large files
for await (const chunk of storage.stream('logs.jsonl', 1000)) {
  processChunk(chunk);
}
```

### Namespace System

Hierarchical partition management for organizing large datasets:

```typescript
import { NamespaceManager, NamespaceMetadataManager } from '@digital-minion/data';

// Create namespace
const metadataManager = new NamespaceMetadataManager();
await metadataManager.createNamespace({
  namespace: 'transactions',
  basePath: './data',
  partitionSchema: {
    order: ['year', 'country'],
    partitions: {
      year: {
        type: 'string',
        regex: '^\\d{4}$',
        required: true
      },
      country: {
        type: 'string',
        regex: '^[A-Z]{2}$',
        required: true
      }
    }
  },
  dataFormat: 'jsonl'
});

// Directory structure:
// ./data/transactions/
// ├── namespace.meta.json
// └── data/
//     ├── year=2025/country=US/data.jsonl
//     └── year=2025/country=UK/data.jsonl
```

### RowId System

Partition-aware composite keys for direct lookups:

```typescript
import { RowIdGenerator, RowIdResolver } from '@digital-minion/data';

const generator = new RowIdGenerator();
const resolver = new RowIdResolver({ basePath: './data' });

// Generate rowId from data
const transaction = { year: '2025', country: 'US', amount: 100 };
const rowId = generator.generateRowIdFromItem(metadata, transaction);
// → "2025.US.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"

// Direct O(1) lookup by rowId
const result = await resolver.lookupByRowId('transactions', rowId);
// → Goes straight to ./data/transactions/data/year=2025/country=US/data.jsonl

// CRUD operations
await resolver.createByRowId('transactions', { ...transaction, rowId });
await resolver.updateByRowId('transactions', rowId, { amount: 150 });
await resolver.deleteByRowId('transactions', rowId);
```

### Repository Pattern

```typescript
import { BaseRepository } from '@digital-minion/data';

class TodoRepository extends BaseRepository<Todo> {
  protected getDataPath(): string {
    return './data/todos.jsonl';
  }

  protected async validate(item: Todo): Promise<boolean> {
    return !!item.id && !!item.title;
  }
}

const repo = new TodoRepository({
  basePath: './data',
  collection: 'todos'
});

await repo.initialize();

// CRUD operations
const todo = await repo.create({ id: '1', title: 'Task', done: false });
const found = await repo.findById('1');
await repo.update({ id: '1' }, { done: true });
await repo.deleteById('1');
```

### Data Layer

The DataLayer provides a unified interface for partition-based data access with advanced features:

```typescript
import { DataLayer } from '@digital-minion/data';

const dataLayer = new DataLayer({
  basePath: './data',
  collection: 'users',
  adapterType: 'jsonl',
  enableCaching: true,
  autoDiscoverPartitions: true
});

await dataLayer.initialize();

// Query with filters
const result = await dataLayer.query({
  filters: { status: 'active' },
  sort: { field: 'createdAt', direction: 'desc' },
  limit: 10
});

// Map-reduce operations
const stats = await dataLayer.mapReduce({
  map: (user) => [['country', 1]],
  reduce: (country, counts) => counts.reduce((a, b) => a + b, 0)
});

// Stream large datasets
for await (const chunk of dataLayer.stream({ chunkSize: 1000 })) {
  processChunk(chunk.data);
}

// Create indexes for fast lookups
await dataLayer.createIndex('email', ['email'], { unique: true });
const users = await dataLayer.queryWithIndex('email', 'user@example.com');
```

## Package Structure

```
@digital-minion/data/
├── storage/           # JSON storage layer
│   ├── json.storage.ts
│   ├── jsonl.storage.ts
│   └── storage.types.ts
├── namespace/         # Partition-based namespace system
│   ├── namespace.manager.ts
│   ├── namespace-metadata.manager.ts
│   ├── partition-maintenance.job.ts
│   ├── rowid.generator.ts
│   ├── rowid.resolver.ts
│   └── namespace.types.ts
├── layer/             # Data layer abstraction
│   ├── data.layer.ts
│   ├── partition-manifest.manager.ts
│   ├── data.types.ts
│   └── adapters/
│       ├── json.adapter.ts
│       └── jsonl.adapter.ts
├── operations/        # Data operations
│   ├── mapreduce/
│   ├── filter/
│   ├── cache/
│   ├── index/
│   ├── stream/
│   └── retry/
└── patterns/          # Design patterns
    ├── base.repository.ts
    ├── base.manager.ts
    ├── query.helpers.ts
    └── query.types.ts
```

## Installation

```bash
npm install @digital-minion/data
```

## License

Apache-2.0
