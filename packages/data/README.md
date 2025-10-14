# @digital-minion/data

Comprehensive data storage and management system for Digital Minion with partition-aware architecture, hierarchical namespace organization, and O(1) lookups via composite rowIds.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
  - [Partitions](#partitions)
  - [Namespaces](#namespaces)
  - [RowIds](#rowids)
  - [Manifests](#manifests)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Detailed Guide](#detailed-guide)
  - [Understanding Partitions](#understanding-partitions)
  - [Defining Partition Schemas](#defining-partition-schemas)
  - [Working with Manifests](#working-with-manifests)
  - [RowId System Deep Dive](#rowid-system-deep-dive)
  - [Storage Layer](#storage-layer)
  - [Data Layer](#data-layer)
  - [Repository Pattern](#repository-pattern)
- [Complete Examples](#complete-examples)
- [API Reference](#api-reference)

## Overview

This package provides a complete data infrastructure for managing large datasets with hierarchical organization, efficient lookups, and flexible querying capabilities.

### Key Features

- **Partition-Based Storage** - Hierarchical data organization with configurable partition schemas
- **Namespace System** - Multi-level partition management with validation and metadata tracking
- **RowId System** - Partition-aware composite keys that enable O(1) direct lookups
- **Manifest Management** - Lightweight partition tracking and auto-discovery
- **Storage Abstraction** - JSON and JSONL storage with consistent interfaces
- **Data Layer** - Advanced operations (map-reduce, streaming, caching, indexing)
- **Design Patterns** - Repository and Manager patterns for domain logic

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Application Layer                   │
│            (Repositories & Managers)                 │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│                   Data Layer                         │
│     (Query, Stream, MapReduce, Cache, Index)        │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│              Namespace & Partition Layer             │
│   (NamespaceManager, RowIdGenerator, Manifests)     │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│                  Storage Layer                       │
│          (JsonObjectStorage, JsonlRowStorage)        │
└─────────────────────────────────────────────────────┘
                          │
                   File System
```

## Core Concepts

### Partitions

**Partitions** are the fundamental organizational unit in @digital-minion/data. They divide large datasets into manageable segments based on data attributes, enabling:

- **Efficient Queries** - Only scan relevant partitions, not entire datasets
- **Parallel Processing** - Process multiple partitions concurrently
- **Storage Optimization** - Organize data hierarchically on disk
- **Direct Access** - Go straight to the right partition via rowIds

#### Partition Structure

A partition is defined by a **partition path** like `year=2025/country=US/state=TX`, where:
- Each level represents a partition key (`year`, `country`, `state`)
- Each key has a value (`2025`, `US`, `TX`)
- The hierarchy is fixed and defined in the partition schema

#### Physical Layout

```
data/
└── transactions/           # Namespace
    ├── namespace.meta.json # Metadata and schema
    └── data/               # Partition data
        ├── year=2024/
        │   ├── country=US/
        │   │   ├── state=CA/
        │   │   │   └── data.jsonl
        │   │   └── state=TX/
        │   │       └── data.jsonl
        │   └── country=UK/
        │       └── data.jsonl
        └── year=2025/
            └── country=US/
                └── state=NY/
                    └── data.jsonl
```

### Namespaces

A **namespace** is a complete partition-based dataset with:
- A **partition schema** defining the hierarchy
- **Validation rules** for partition values
- **Metadata** tracking discovered partitions
- **Data format** specification (JSON or JSONL)

Namespaces provide:
- **Schema Enforcement** - Validate data against partition schema before writes
- **Auto-Discovery** - Automatically detect existing partitions on disk
- **Maintenance Operations** - Add/remove partition levels, split/merge partitions
- **Query Optimization** - Resolve which partitions to scan for a given query

### RowIds

A **rowId** is a partition-aware composite key that encodes:
1. All partition values in order
2. A unique identifier (GUID) within the partition

**Example:** `2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f`
- Partition values: `2025`, `US`, `TX`
- GUID: `a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f`
- Maps to: `year=2025/country=US/state=TX`

**Benefits:**
- **O(1) Lookups** - Parse the rowId to get the exact partition path, then search one file
- **Self-Describing** - The rowId contains location information
- **Portable** - Can be stored, shared, and used as foreign keys
- **Efficient Updates/Deletes** - Go directly to the partition

### Manifests

A **manifest** is a lightweight metadata file that tracks partitions in a collection. Two types:

#### 1. Namespace Manifest (`namespace.meta.json`)

Full-featured manifest with partition schema, validation, and discovery:

```json
{
  "namespace": "transactions",
  "version": "1.0.0",
  "created": "2025-10-04T12:00:00Z",
  "updated": "2025-10-11T10:30:00Z",
  "partitionSchema": {
    "order": ["year", "country"],
    "partitions": {
      "year": {
        "type": "string",
        "regex": "^\\d{4}$",
        "required": true,
        "description": "Transaction year"
      },
      "country": {
        "type": "string",
        "regex": "^[A-Z]{2}$",
        "required": true,
        "description": "Country code"
      }
    }
  },
  "discoveredPartitions": [
    {
      "path": "year=2025/country=US",
      "values": { "year": "2025", "country": "US" },
      "created": "2025-10-04T12:00:00Z",
      "itemCount": 1500,
      "lastUpdated": "2025-10-11T10:30:00Z",
      "sizeBytes": 245600
    }
  ],
  "dataFormat": "jsonl"
}
```

#### 2. Simple Manifest (`manifest.json`)

Lightweight manifest for basic partition tracking:

```json
{
  "collection": "users",
  "description": "User data by region",
  "created_at": "2025-10-04T12:00:00Z",
  "updated_at": "2025-10-11T10:30:00Z",
  "settings": {
    "defaultPartition": "default",
    "autoDiscoverPartitions": true
  },
  "partitions": {
    "us-west": {
      "id": "us-west",
      "name": "US West",
      "type": "file",
      "location": "./data/users/us-west/data.jsonl",
      "metadata": {
        "created_at": "2025-10-04T12:00:00Z",
        "updated_at": "2025-10-11T10:30:00Z"
      }
    }
  }
}
```

## Installation

```bash
npm install @digital-minion/data
```

## Quick Start

```typescript
import {
  NamespaceMetadataManager,
  NamespaceManager,
  RowIdGenerator,
  RowIdResolver
} from '@digital-minion/data';

// 1. Create a namespace with partition schema
const metadataManager = new NamespaceMetadataManager();
await metadataManager.createNamespace({
  namespace: 'orders',
  basePath: './data',
  partitionSchema: {
    order: ['year', 'month'],
    partitions: {
      year: {
        type: 'string',
        regex: '^\\d{4}$',
        required: true,
        deriveFromData: '(item) => new Date(item.orderDate).getFullYear().toString()'
      },
      month: {
        type: 'string',
        regex: '^(0[1-9]|1[0-2])$',
        required: true,
        deriveFromData: '(item) => (new Date(item.orderDate).getMonth() + 1).toString().padStart(2, "0")'
      }
    }
  },
  dataFormat: 'jsonl'
});

// 2. Generate rowId for an order
const generator = new RowIdGenerator();
const metadata = await metadataManager.loadMetadata('./data', 'orders');

const order = {
  orderDate: '2025-10-15T14:30:00Z',
  customerId: 'cust-123',
  amount: 299.99
};

const rowId = generator.generateRowIdFromItem(metadata, order);
// Result: "2025.10.abc123def456"

// 3. Lookup order directly by rowId (O(1) operation)
const resolver = new RowIdResolver({ basePath: './data' });
const result = await resolver.lookupByRowId('orders', rowId);

if (result.found) {
  console.log('Found order:', result.item);
  console.log('Location:', result.filePath);
  console.log('Lookup time:', result.lookupTime, 'ms');
}
```

## Detailed Guide

### Understanding Partitions

Partitions organize data hierarchically based on attributes. Each partition level adds another dimension of organization.

#### When to Use Partitions

**Good Use Cases:**
- **Time-series data** - Partition by year/month/day
- **Geographic data** - Partition by country/region/city
- **Multi-tenant data** - Partition by tenant/environment
- **Categorized data** - Partition by category/subcategory

**Benefits:**
- Query only relevant partitions (scan year=2025, not all years)
- Parallel processing of partitions
- Easy data lifecycle management (archive old partitions)
- Better file system performance (smaller files)

**Avoid Over-Partitioning:**
- Too many levels create deep directory trees
- Too few items per partition wastes disk space
- Balance granularity with access patterns

#### Partition Queries

```typescript
const manager = new NamespaceManager({ basePath: './data' });

// Query single partition
const partitions = await manager.resolveQueryPartitions('orders', {
  partitionFilter: { year: '2025', month: '10' }
});
// Returns: ["year=2025/month=10"]

// Query all partitions for a year
const yearPartitions = await manager.resolveQueryPartitions('orders', {
  partitionFilter: { year: '2025' }
});
// Returns: ["year=2025/month=01", "year=2025/month=02", ..., "year=2025/month=10"]

// Query multiple specific values
const multiPartitions = await manager.resolveQueryPartitions('orders', {
  partitionFilter: { year: '2025', month: ['01', '02', '03'] }
});
// Returns: ["year=2025/month=01", "year=2025/month=02", "year=2025/month=03"]

// Query all partitions (no filter)
const allPartitions = await manager.resolveQueryPartitions('orders');
// Returns: All discovered partitions
```

### Defining Partition Schemas

The partition schema is the heart of your namespace configuration. It defines:
- **Partition levels** and their order
- **Validation rules** for partition values
- **Data derivation** functions to extract partition values from items

#### Schema Structure

```typescript
interface PartitionSchemaConfig {
  // Ordered list of partition keys (defines hierarchy)
  order: string[];

  // Field definitions for each partition key
  partitions: Record<string, PartitionFieldSchema>;
}

interface PartitionFieldSchema {
  // Data type
  type: 'string' | 'number' | 'date';

  // Regex validation (for strings)
  regex?: string;

  // Required field?
  required: boolean;

  // Default value if not provided
  defaultValue?: any;

  // Description
  description?: string;

  // Function to derive value from item data
  // Stored as string, evaluated at runtime
  deriveFromData?: string;
}
```

#### Example: E-commerce Orders

```typescript
const orderSchema = {
  order: ['year', 'month', 'status'],
  partitions: {
    year: {
      type: 'string',
      regex: '^\\d{4}$',
      required: true,
      description: 'Order year',
      // Derive from orderDate field
      deriveFromData: '(item) => new Date(item.orderDate).getFullYear().toString()'
    },
    month: {
      type: 'string',
      regex: '^(0[1-9]|1[0-2])$',
      required: true,
      description: 'Order month',
      deriveFromData: '(item) => (new Date(item.orderDate).getMonth() + 1).toString().padStart(2, "0")'
    },
    status: {
      type: 'string',
      regex: '^(pending|completed|cancelled)$',
      required: true,
      description: 'Order status'
    }
  }
};

// Results in structure:
// data/orders/data/year=2025/month=10/status=completed/data.jsonl
```

#### Example: Log Files

```typescript
const logSchema = {
  order: ['year', 'month', 'day', 'service', 'level'],
  partitions: {
    year: {
      type: 'string',
      regex: '^\\d{4}$',
      required: true,
      deriveFromData: '(item) => new Date(item.timestamp).getFullYear().toString()'
    },
    month: {
      type: 'string',
      regex: '^(0[1-9]|1[0-2])$',
      required: true,
      deriveFromData: '(item) => (new Date(item.timestamp).getMonth() + 1).toString().padStart(2, "0")'
    },
    day: {
      type: 'string',
      regex: '^(0[1-9]|[12][0-9]|3[01])$',
      required: true,
      deriveFromData: '(item) => new Date(item.timestamp).getDate().toString().padStart(2, "0")'
    },
    service: {
      type: 'string',
      regex: '^[a-z-]+$',
      required: true,
      description: 'Service name (e.g., api-gateway, auth-service)'
    },
    level: {
      type: 'string',
      regex: '^(debug|info|warn|error|fatal)$',
      required: true,
      description: 'Log level'
    }
  }
};

// Results in structure:
// data/logs/data/year=2025/month=10/day=11/service=api-gateway/level=error/data.jsonl
```

#### Example: Multi-Tenant SaaS

```typescript
const tenantSchema = {
  order: ['tenant', 'environment', 'dataType'],
  partitions: {
    tenant: {
      type: 'string',
      regex: '^[a-z0-9-]+$',
      required: true,
      description: 'Tenant identifier'
    },
    environment: {
      type: 'string',
      regex: '^(dev|staging|production)$',
      required: true,
      description: 'Environment name',
      defaultValue: 'production'
    },
    dataType: {
      type: 'string',
      regex: '^(users|transactions|analytics)$',
      required: true,
      description: 'Type of data'
    }
  }
};

// Results in structure:
// data/saas/data/tenant=acme-corp/environment=production/dataType=users/data.jsonl
```

#### Validation

The partition schema automatically validates writes:

```typescript
const manager = new NamespaceManager({ basePath: './data' });

// Valid order
const order1 = {
  orderDate: '2025-10-15T14:30:00Z',
  status: 'completed',
  amount: 100
};

const validation1 = await manager.validateWrite('orders', order1);
// Result: {
//   isValid: true,
//   errors: [],
//   partitionPath: "year=2025/month=10/status=completed",
//   partitionValues: { year: "2025", month: "10", status: "completed" }
// }

// Invalid order (bad status)
const order2 = {
  orderDate: '2025-10-15T14:30:00Z',
  status: 'invalid-status',
  amount: 100
};

const validation2 = await manager.validateWrite('orders', order2);
// Result: {
//   isValid: false,
//   errors: [
//     {
//       field: 'status',
//       message: "Value 'invalid-status' does not match regex '^(pending|completed|cancelled)$'",
//       code: 'REGEX_MISMATCH',
//       expected: '^(pending|completed|cancelled)$',
//       actual: 'invalid-status'
//     }
//   ]
// }
```

### Working with Manifests

#### Creating a Namespace Manifest

```typescript
import { NamespaceMetadataManager } from '@digital-minion/data';

const metadataManager = new NamespaceMetadataManager();

// Create namespace with full partition schema
const metadata = await metadataManager.createNamespace({
  namespace: 'transactions',
  basePath: './data',
  partitionSchema: {
    order: ['year', 'country'],
    partitions: {
      year: {
        type: 'string',
        regex: '^\\d{4}$',
        required: true,
        description: 'Transaction year'
      },
      country: {
        type: 'string',
        regex: '^[A-Z]{2}$',
        required: true,
        description: 'ISO 3166-1 alpha-2 country code'
      }
    }
  },
  dataFormat: 'jsonl',
  itemSchema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      amount: { type: 'number' },
      currency: { type: 'string' }
    }
  }
});

// Creates:
// ./data/transactions/namespace.meta.json
// ./data/transactions/data/ (empty, partitions created on write)
```

#### Loading a Namespace Manifest

```typescript
// Load existing namespace
const metadata = await metadataManager.loadMetadata('./data', 'transactions');

console.log('Namespace:', metadata.namespace);
console.log('Partition order:', metadata.partitionSchema.order);
console.log('Data format:', metadata.dataFormat);
console.log('Discovered partitions:', metadata.discoveredPartitions.length);
```

#### Discovering Partitions

The namespace system can auto-discover partitions by scanning the filesystem:

```typescript
// Discover all existing partitions
const partitions = await metadataManager.discoverPartitions('./data', 'transactions');

// Returns:
// [
//   {
//     path: "year=2025/country=US",
//     values: { year: "2025", country: "US" },
//     created: "2025-10-04T12:00:00Z",
//     itemCount: 1500,
//     lastUpdated: "2025-10-11T10:30:00Z",
//     sizeBytes: 245600
//   },
//   {
//     path: "year=2025/country=UK",
//     values: { year: "2025", country: "UK" },
//     created: "2025-10-05T08:15:00Z",
//     itemCount: 800,
//     lastUpdated: "2025-10-11T09:20:00Z",
//     sizeBytes: 132400
//   }
// ]

// Update namespace metadata with discovered partitions
await metadataManager.updateDiscoveredPartitions('./data', 'transactions', partitions);
```

#### Creating a Simple Manifest

For simpler use cases without hierarchical partitions:

```typescript
import { PartitionManifestManager } from '@digital-minion/data';

const manifestManager = new PartitionManifestManager('./data', 'users');

// Create simple manifest
await manifestManager.createManifest({
  collection: 'users',
  description: 'User data by region',
  settings: {
    defaultPartition: 'default',
    autoDiscoverPartitions: true
  }
});

// Add partitions manually
await manifestManager.addPartition({
  id: 'us-west',
  name: 'US West',
  type: 'file',
  location: './data/users/us-west/data.jsonl',
  metadata: {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
});

// Or auto-discover
await manifestManager.discoverPartitions('./data');

// Get all partitions
const partitions = manifestManager.getAllPartitions();
```

#### Manifest Configuration Best Practices

1. **Use Namespace Manifests For:**
   - Hierarchical data organization
   - Complex validation requirements
   - Time-series data
   - Data that needs partitioning by multiple dimensions

2. **Use Simple Manifests For:**
   - Flat partition structures
   - Manual partition management
   - Simple collections with a few partitions
   - Migration from non-partitioned systems

3. **Manifest Settings:**
   ```typescript
   {
     // Auto-discover new partitions on initialization
     autoDiscoverPartitions: true,

     // Default partition for writes without explicit partition
     defaultPartition: 'default'
   }
   ```

### RowId System Deep Dive

The RowId system is the key to efficient lookups in partitioned data. It works by encoding partition information directly into the ID.

#### RowId Structure

A rowId consists of:
1. **Partition values** in schema order (joined by separator, default: `.`)
2. **GUID** - unique identifier within the partition

**Format:** `{partition1}.{partition2}.{...}.{guid}`

**Example with schema `['year', 'country', 'state']`:**
```
2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f
│    │  │  │
│    │  │  └─ GUID (unique within partition)
│    │  └──── state=TX
│    └─────── country=US
└──────────── year=2025

Maps to file: data/transactions/data/year=2025/country=US/state=TX/data.jsonl
```

#### Generating RowIds

```typescript
import { RowIdGenerator } from '@digital-minion/data';

const generator = new RowIdGenerator();

// Method 1: From partition values
const rowId1 = generator.generateRowId(metadata, {
  year: '2025',
  country: 'US',
  state: 'TX'
});
// Result: "2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"

// Method 2: From item data (uses deriveFromData functions)
const transaction = {
  transactionDate: '2025-10-15T14:30:00Z',
  country: 'US',
  state: 'TX',
  amount: 100
};

const rowId2 = generator.generateRowIdFromItem(metadata, transaction);
// Result: "2025.US.TX.7e9f2a4c-1b3d-5e8f-9a2c-4d6e8f1a3b5c"

// Method 3: With custom options
const rowId3 = generator.generateRowId(
  metadata,
  { year: '2025', country: 'US', state: 'TX' },
  {
    separator: '-',           // Use - instead of .
    includeKeys: true,        // Include partition key names
    guidGenerator: () => 'custom-guid'
  }
);
// Result: "year=2025-country=US-state=TX-custom-guid"
```

#### Parsing RowIds

```typescript
const rowId = '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f';

const parsed = generator.parseRowId(rowId, metadata);

// Result:
{
  rowId: "2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f",
  partitionValues: ["2025", "US", "TX"],
  partitionPath: "year=2025/country=US/state=TX",
  guid: "a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f",
  partitionMap: {
    year: "2025",
    country: "US",
    state: "TX"
  }
}

// Quick extractions
const partitionPath = generator.getPartitionPathFromRowId(rowId, metadata);
// "year=2025/country=US/state=TX"

const guid = generator.getGuidFromRowId(rowId);
// "a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"
```

#### Validating RowIds

```typescript
// Valid rowId
const valid = generator.validateRowId(
  '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f',
  metadata
);
// true

// Invalid: wrong year format
const invalid1 = generator.validateRowId(
  '25.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f',
  metadata
);
// false (year "25" doesn't match regex ^\d{4}$)

// Invalid: missing partition
const invalid2 = generator.validateRowId(
  '2025.US.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f',
  metadata
);
// false (missing state partition)
```

#### Looking Up by RowId

The real power of rowIds is O(1) lookups:

```typescript
import { RowIdResolver } from '@digital-minion/data';

const resolver = new RowIdResolver({ basePath: './data' });

// Direct lookup
const result = await resolver.lookupByRowId(
  'transactions',
  '2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f'
);

// Result:
{
  found: true,
  item: {
    rowId: "2025.US.TX.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f",
    year: "2025",
    country: "US",
    state: "TX",
    amount: 150.50,
    currency: "USD"
  },
  parsedRowId: {
    partitionPath: "year=2025/country=US/state=TX",
    guid: "a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f",
    // ...
  },
  filePath: "./data/transactions/data/year=2025/country=US/state=TX/data.jsonl",
  lookupTime: 5  // milliseconds
}

// Process:
// 1. Parse rowId → get partition path "year=2025/country=US/state=TX"
// 2. Construct file path → "./data/transactions/data/year=2025/country=US/state=TX/data.jsonl"
// 3. Read file and find item with matching guid
// 4. Return item
//
// No scanning of other partitions needed!
```

#### Batch Lookups

```typescript
const rowIds = [
  '2025.US.TX.guid1',
  '2025.US.CA.guid2',
  '2025.UK.LN.guid3'
];

const results = await resolver.lookupManyByRowId('transactions', rowIds);

// Returns Map<string, RowIdLookupResult>
for (const [rowId, result] of results.entries()) {
  if (result.found) {
    console.log(`Found: ${rowId}`, result.item);
  } else {
    console.log(`Not found: ${rowId}`);
  }
}

// Optimized: Groups rowIds by partition to minimize file reads
```

#### CRUD Operations with RowIds

```typescript
// Create
const newItem = {
  year: '2025',
  country: 'US',
  state: 'TX',
  amount: 200
};
const rowId = generator.generateRowIdFromItem(metadata, newItem);
await resolver.createByRowId('transactions', { ...newItem, rowId });

// Read (shown above)
const result = await resolver.lookupByRowId('transactions', rowId);

// Update
const updated = await resolver.updateByRowId(
  'transactions',
  rowId,
  { amount: 250, status: 'completed' }
);

// Delete
const deleted = await resolver.deleteByRowId('transactions', rowId);
```

#### RowId Configuration Options

```typescript
interface RowIdGenerationOptions {
  // Separator between partition values (default: ".")
  separator?: string;

  // Custom GUID generator function
  guidGenerator?: () => string;

  // Include partition keys in rowId for readability
  // false: "2025.US.TX.guid"
  // true:  "year=2025.country=US.state=TX.guid"
  includeKeys?: boolean;
}

// Global configuration
const generator = new RowIdGenerator({
  includeKeys: false,
  guidFormat: 'uuid'  // 'uuid' | 'short' | 'timestamp'
});

// Per-call override
const rowId = generator.generateRowId(
  metadata,
  partitionValues,
  { separator: '-', includeKeys: true }
);
```

#### RowId Best Practices

1. **Always validate rowIds** before using them for lookups
2. **Store rowIds in your items** - they're self-contained foreign keys
3. **Use batch lookups** when fetching multiple items
4. **Consider includeKeys=true** for human-readable rowIds in logs/debugging
5. **Choose appropriate GUID format:**
   - `uuid` - Maximum uniqueness, longer
   - `short` - Shorter, still very unlikely to collide within a partition
   - `timestamp` - Sortable by creation time

### Storage Layer

The storage layer provides low-level file operations for JSON and JSONL formats.

#### JSON Object Storage

For configuration files, metadata, and single-object storage:

```typescript
import { JsonObjectStorage } from '@digital-minion/data';

const storage = new JsonObjectStorage();

// Write
await storage.write('config.json', { setting: 'value' }, { pretty: true });

// Read
const config = await storage.read('config.json');

// Update (merge)
await storage.update('config.json', { newSetting: 'newValue' });

// Check existence
const exists = await storage.exists('config.json');

// Delete
await storage.delete('config.json');
```

#### JSONL Row Storage

For append-only datasets, logs, and large collections:

```typescript
import { JsonlRowStorage } from '@digital-minion/data';

const storage = new JsonlRowStorage();

// Append single row
await storage.appendRow('logs.jsonl', {
  level: 'info',
  message: 'Started',
  timestamp: new Date().toISOString()
});

// Append multiple rows
await storage.appendRows('logs.jsonl', [
  { level: 'info', message: 'Event 1' },
  { level: 'warn', message: 'Event 2' }
]);

// Read all rows
const rows = await storage.readAll('logs.jsonl');

// Read with pagination
const page = await storage.read('logs.jsonl', 0, 100);

// Count rows
const count = await storage.count('logs.jsonl');

// Stream large files
for await (const chunk of storage.stream('logs.jsonl', 1000)) {
  console.log(`Processing ${chunk.length} rows`);
  processChunk(chunk);
}

// Overwrite entire file
await storage.writeAll('logs.jsonl', filteredRows);
```

### Data Layer

The DataLayer provides high-level data operations with partition awareness.

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
  filters: {
    status: 'active',
    age: { $gte: 18, $lt: 65 }
  },
  sort: { field: 'createdAt', direction: 'desc' },
  limit: 10,
  offset: 0
});

console.log('Found:', result.data.length);
console.log('Total:', result.metadata.totalCount);
console.log('Partitions queried:', result.metadata.partitionsQueried);

// Map-reduce operations
const stats = await dataLayer.mapReduce({
  map: (user) => [['country', 1]],
  reduce: (country, counts) => counts.reduce((a, b) => a + b, 0)
});
// Result: { US: 1500, UK: 800, CA: 300 }

// Stream large datasets
for await (const chunk of dataLayer.stream({ chunkSize: 1000 })) {
  console.log(`Processing ${chunk.data.length} items from ${chunk.metadata.partitionId}`);
  await processChunk(chunk.data);
}

// Create indexes for fast lookups
await dataLayer.createIndex('email', ['email'], { unique: true });
const users = await dataLayer.queryWithIndex('email', 'user@example.com');
```

### Repository Pattern

For domain-specific data access logic:

```typescript
import { BaseRepository } from '@digital-minion/data';

interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

class TodoRepository extends BaseRepository<Todo> {
  protected getDataPath(): string {
    return join(this.config.basePath, 'todos.jsonl');
  }

  protected async validate(item: Todo): Promise<boolean> {
    return !!item.id && !!item.title;
  }

  // Custom domain methods
  async findPending(): Promise<Todo[]> {
    const all = await this.findAll();
    return all.filter(todo => !todo.done);
  }

  async markDone(id: string): Promise<Todo | null> {
    return this.update({ id }, { done: true });
  }
}

// Usage
const repo = new TodoRepository({
  basePath: './data',
  collection: 'todos'
});

await repo.initialize();

// CRUD
const todo = await repo.create({
  id: '1',
  title: 'Learn @digital-minion/data',
  done: false,
  createdAt: new Date().toISOString()
});

const found = await repo.findById('1');
await repo.update({ id: '1' }, { done: true });
await repo.deleteById('1');

// Custom methods
const pending = await repo.findPending();
await repo.markDone('1');
```

## Complete Examples

### Example 1: E-commerce Order System

```typescript
import {
  NamespaceMetadataManager,
  NamespaceManager,
  RowIdGenerator,
  RowIdResolver,
  JsonlRowStorage
} from '@digital-minion/data';

// Setup
const metadataManager = new NamespaceMetadataManager();
await metadataManager.createNamespace({
  namespace: 'orders',
  basePath: './data',
  partitionSchema: {
    order: ['year', 'month', 'status'],
    partitions: {
      year: {
        type: 'string',
        regex: '^\\d{4}$',
        required: true,
        deriveFromData: '(item) => new Date(item.orderDate).getFullYear().toString()'
      },
      month: {
        type: 'string',
        regex: '^(0[1-9]|1[0-2])$',
        required: true,
        deriveFromData: '(item) => (new Date(item.orderDate).getMonth() + 1).toString().padStart(2, "0")'
      },
      status: {
        type: 'string',
        regex: '^(pending|processing|shipped|delivered|cancelled)$',
        required: true
      }
    }
  },
  dataFormat: 'jsonl'
});

// Create order
const generator = new RowIdGenerator();
const metadata = await metadataManager.loadMetadata('./data', 'orders');

const order = {
  orderDate: '2025-10-15T14:30:00Z',
  status: 'pending',
  customerId: 'cust-123',
  items: [
    { productId: 'prod-1', quantity: 2, price: 50 },
    { productId: 'prod-2', quantity: 1, price: 100 }
  ],
  total: 200
};

const rowId = generator.generateRowIdFromItem(metadata, order);
const orderWithId = { ...order, rowId };

// Write to partition
const manager = new NamespaceManager({ basePath: './data' });
const validation = await manager.validateWrite('orders', orderWithId);
await manager.ensurePartitionExists('orders', validation.partitionPath!, 'jsonl');

const storage = new JsonlRowStorage();
const filePath = manager.getPartitionFilePath('orders', validation.partitionPath!, 'jsonl');
await storage.appendRow(filePath, orderWithId);

// Later: Lookup order
const resolver = new RowIdResolver({ basePath: './data' });
const result = await resolver.lookupByRowId('orders', rowId);

// Update order status
await resolver.updateByRowId('orders', rowId, { status: 'shipped' });

// Query orders
const partitions = await manager.resolveQueryPartitions('orders', {
  partitionFilter: { year: '2025', month: '10', status: 'shipped' }
});
// Only queries: year=2025/month=10/status=shipped/data.jsonl
```

### Example 2: Log Aggregation System

```typescript
// Setup namespace
await metadataManager.createNamespace({
  namespace: 'logs',
  basePath: './data',
  partitionSchema: {
    order: ['year', 'month', 'day', 'service'],
    partitions: {
      year: {
        type: 'string',
        regex: '^\\d{4}$',
        required: true,
        deriveFromData: '(item) => new Date(item.timestamp).getFullYear().toString()'
      },
      month: {
        type: 'string',
        regex: '^(0[1-9]|1[0-2])$',
        required: true,
        deriveFromData: '(item) => (new Date(item.timestamp).getMonth() + 1).toString().padStart(2, "0")'
      },
      day: {
        type: 'string',
        regex: '^(0[1-9]|[12][0-9]|3[01])$',
        required: true,
        deriveFromData: '(item) => new Date(item.timestamp).getDate().toString().padStart(2, "0")'
      },
      service: {
        type: 'string',
        regex: '^[a-z-]+$',
        required: true
      }
    }
  },
  dataFormat: 'jsonl'
});

// Ingest logs
const logEntry = {
  timestamp: '2025-10-11T15:30:45Z',
  service: 'api-gateway',
  level: 'error',
  message: 'Connection timeout',
  metadata: { userId: 'user-123', endpoint: '/api/orders' }
};

// Auto-partitioned into: year=2025/month=10/day=11/service=api-gateway/data.jsonl

// Query today's errors from api-gateway
const today = new Date();
const partitions = await manager.resolveQueryPartitions('logs', {
  partitionFilter: {
    year: today.getFullYear().toString(),
    month: (today.getMonth() + 1).toString().padStart(2, '0'),
    day: today.getDate().toString().padStart(2, '0'),
    service: 'api-gateway'
  }
});
// Queries only 1 partition file
```

### Example 3: Multi-Tenant Analytics

```typescript
// Setup
await metadataManager.createNamespace({
  namespace: 'analytics',
  basePath: './data',
  partitionSchema: {
    order: ['tenant', 'year', 'month', 'eventType'],
    partitions: {
      tenant: {
        type: 'string',
        regex: '^[a-z0-9-]+$',
        required: true
      },
      year: {
        type: 'string',
        regex: '^\\d{4}$',
        required: true,
        deriveFromData: '(item) => new Date(item.timestamp).getFullYear().toString()'
      },
      month: {
        type: 'string',
        regex: '^(0[1-9]|1[0-2])$',
        required: true,
        deriveFromData: '(item) => (new Date(item.timestamp).getMonth() + 1).toString().padStart(2, "0")'
      },
      eventType: {
        type: 'string',
        regex: '^[a-z_]+$',
        required: true
      }
    }
  },
  dataFormat: 'jsonl'
});

// Track event
const event = {
  tenant: 'acme-corp',
  timestamp: '2025-10-11T15:30:00Z',
  eventType: 'page_view',
  userId: 'user-456',
  page: '/pricing',
  metadata: { referrer: 'google.com' }
};

// Query tenant analytics for October
const partitions = await manager.resolveQueryPartitions('analytics', {
  partitionFilter: {
    tenant: 'acme-corp',
    year: '2025',
    month: '10'
  }
});
// Queries all event types for acme-corp in Oct 2025

// Use DataLayer for aggregations
const dataLayer = new DataLayer({
  basePath: './data',
  collection: 'analytics',
  adapterType: 'jsonl'
});

await dataLayer.initialize();

const eventCounts = await dataLayer.mapReduce({
  map: (event) => [[event.eventType, 1]],
  reduce: (eventType, counts) => counts.reduce((a, b) => a + b, 0)
});
// Result: { page_view: 5000, button_click: 1200, form_submit: 300 }
```

## API Reference

### Core Classes

#### NamespaceMetadataManager

Manages namespace creation, metadata, and partition discovery.

```typescript
class NamespaceMetadataManager {
  async createNamespace(config: CreateNamespaceConfig): Promise<NamespaceMetadata>
  async loadMetadata(basePath: string, namespace: string): Promise<NamespaceMetadata>
  async discoverPartitions(basePath: string, namespace: string): Promise<PartitionInfo[]>
  async updateDiscoveredPartitions(basePath: string, namespace: string, partitions: PartitionInfo[]): Promise<void>
}
```

#### NamespaceManager

Manages partition operations, validation, and querying.

```typescript
class NamespaceManager {
  constructor(config: { basePath: string })

  async validateWrite(namespace: string, item: any): Promise<PartitionValidationResult>
  async ensurePartitionExists(namespace: string, partitionPath: string, format: 'json' | 'jsonl'): Promise<void>
  async resolveQueryPartitions(namespace: string, options?: NamespaceQueryOptions): Promise<string[]>
  getPartitionFilePath(namespace: string, partitionPath: string, format: 'json' | 'jsonl'): string

  async addPartition(namespace: string, config: AddPartitionConfig): Promise<MaintenanceJobResult>
  async collapsePartition(namespace: string, key: string): Promise<MaintenanceJobResult>
}
```

#### RowIdGenerator

Generates and parses partition-aware rowIds.

```typescript
class RowIdGenerator {
  constructor(config?: RowIdConfig)

  generateRowId(metadata: NamespaceMetadata, partitionValues: Record<string, string>, options?: RowIdGenerationOptions): string
  generateRowIdFromItem(metadata: NamespaceMetadata, item: any, options?: RowIdGenerationOptions): string
  parseRowId(rowId: string, metadata: NamespaceMetadata): ParsedRowId
  validateRowId(rowId: string, metadata: NamespaceMetadata): boolean
  getPartitionPathFromRowId(rowId: string, metadata: NamespaceMetadata): string
  getGuidFromRowId(rowId: string): string
}
```

#### RowIdResolver

Performs CRUD operations using rowIds.

```typescript
class RowIdResolver {
  constructor(config: { basePath: string })

  async lookupByRowId(namespace: string, rowId: string): Promise<RowIdLookupResult>
  async lookupManyByRowId(namespace: string, rowIds: string[]): Promise<Map<string, RowIdLookupResult>>
  async createByRowId(namespace: string, item: any): Promise<void>
  async updateByRowId(namespace: string, rowId: string, updates: Partial<any>): Promise<any | null>
  async deleteByRowId(namespace: string, rowId: string): Promise<boolean>
  async getPartitionItems(namespace: string, rowId: string): Promise<any[]>
}
```

#### DataLayer

High-level data operations with partition awareness.

```typescript
class DataLayer<T = any> {
  constructor(config: DataLayerConfig)

  async initialize(): Promise<void>
  async query(query: Query<T>): Promise<QueryResult<T>>
  async mapReduce(operation: MapReduceOperation<T, any>): Promise<MapReduceResult<any>>
  async stream(options?: StreamOptions): AsyncGenerator<StreamChunk<T>>
  async createIndex(name: string, fields: string[], options?: IndexOptions): Promise<void>
  async queryWithIndex(indexName: string, value: any): Promise<T[]>
}
```

### Storage Classes

#### JsonObjectStorage

```typescript
class JsonObjectStorage {
  async read(filePath: string): Promise<any>
  async write(filePath: string, data: any, options?: { pretty?: boolean }): Promise<void>
  async update(filePath: string, updates: any): Promise<void>
  async exists(filePath: string): Promise<boolean>
  async delete(filePath: string): Promise<void>
}
```

#### JsonlRowStorage

```typescript
class JsonlRowStorage {
  async appendRow(filePath: string, row: any): Promise<void>
  async appendRows(filePath: string, rows: any[]): Promise<void>
  async readAll(filePath: string): Promise<any[]>
  async read(filePath: string, offset: number, limit: number): Promise<any[]>
  async count(filePath: string): Promise<number>
  async writeAll(filePath: string, rows: any[]): Promise<void>
  async stream(filePath: string, chunkSize: number): AsyncGenerator<any[]>
}
```

## License

Apache-2.0
