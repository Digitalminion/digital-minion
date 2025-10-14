# Method System with @digital-minion/data Storage

## Overview

This document describes how the abstract, domain-agnostic Method system would be implemented using the `@digital-minion/data` storage infrastructure, leveraging partition-aware storage, hierarchical namespaces, and O(1) rowId lookups.

## Storage Architecture

### Namespace Organization

Methods are organized into **domain-specific namespaces**, each with its own partition schema:

```
data/
├── methods-software-development/    # Software dev domain
│   ├── namespace.meta.json
│   └── data/
│       ├── category=implementation/
│       │   ├── subject=Class/
│       │   │   └── data.jsonl        # Method items for Class
│       │   └── subject=Interface/
│       │       └── data.jsonl
│       ├── category=testing/
│       │   └── subject=UnitTest/
│       │       └── data.jsonl
│       └── category=documentation/
│           └── subject=APIDoc/
│               └── data.jsonl
│
├── methods-customer-service/         # Customer service domain
│   ├── namespace.meta.json
│   └── data/
│       ├── category=communication/
│       │   ├── subject=EmailResponse/
│       │   │   └── data.jsonl
│       │   └── subject=PhoneCall/
│       │       └── data.jsonl
│       └── category=empathy/
│           └── subject=ComplaintHandling/
│               └── data.jsonl
│
└── methods-marketing/                # Marketing domain
    ├── namespace.meta.json
    └── data/
        ├── category=copywriting/
        │   └── subject=LandingPage/
        │       └── data.jsonl
        └── category=analytics/
            └── subject=CampaignTracking/
                └── data.jsonl
```

### Partition Schema

Each method domain uses a **2-level partition schema** for efficient organization:

**Level 1: Category** - Groups method items by quality dimension (implementation, testing, communication, empathy, etc.)
**Level 2: Subject** - Specific work type within the category (Class, Interface, EmailResponse, etc.)

```typescript
const methodPartitionSchema = {
  order: ['category', 'subject'],
  partitions: {
    category: {
      type: 'string',
      regex: '^[a-z-]+$',
      required: true,
      description: 'Quality category (e.g., implementation, communication)',
      deriveFromData: '(item) => item.category'
    },
    subject: {
      type: 'string',
      regex: '^[A-Za-z]+$',
      required: true,
      description: 'Subject this method item belongs to',
      deriveFromData: '(item) => item.subjectName'
    }
  }
};
```

### RowId Structure for Method Items

Each method item has a unique rowId that encodes its location:

**Format:** `{category}.{subject}.{guid}`

**Examples:**

```typescript
// Software Development Domain
"implementation.Class.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f"
// Maps to: category=implementation/subject=Class/data.jsonl

"testing.UnitTest.7e9f2a4c-1b3d-5e8f-9a2c-4d6e8f1a3b5c"
// Maps to: category=testing/subject=UnitTest/data.jsonl

// Customer Service Domain
"communication.EmailResponse.b5c8d1e3-2a4f-6d9b-1c3e-5f7a9b2d4c6e"
// Maps to: category=communication/subject=EmailResponse/data.jsonl

"empathy.ComplaintHandling.9a1c3e5f-7b2d-4c6e-8f1a-3b5c7d9e1f2a"
// Maps to: category=empathy/subject=ComplaintHandling/data.jsonl
```

**Benefits:**
- **O(1) Lookup** - Parse rowId to get exact partition, load one file
- **Self-Describing** - RowId tells you category and subject
- **Foreign Keys** - Use method item rowIds to reference from todos
- **Portable** - Can be stored, shared across systems

## Domain Definition and Storage

### Domain Namespace Metadata

Each domain has a namespace with its own metadata:

```typescript
// Software Development Domain
await metadataManager.createNamespace({
  namespace: 'methods-software-development',
  basePath: './data',
  partitionSchema: methodPartitionSchema,
  dataFormat: 'jsonl',
  itemSchema: {
    type: 'object',
    properties: {
      rowId: { type: 'string' },
      id: { type: 'string' },
      subjectName: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      required: { type: 'boolean' },
      validationRule: { type: 'object' },
      artifactType: { type: 'string' },
      tips: { type: 'array' },
      example: { type: 'string' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' }
    }
  }
});

// Customer Service Domain
await metadataManager.createNamespace({
  namespace: 'methods-customer-service',
  basePath: './data',
  partitionSchema: methodPartitionSchema,
  dataFormat: 'jsonl'
});
```

### Domain Registry

A separate namespace tracks all available domains:

```typescript
// data/method-domains/namespace.meta.json
await metadataManager.createNamespace({
  namespace: 'method-domains',
  basePath: './data',
  partitionSchema: {
    order: ['status'],
    partitions: {
      status: {
        type: 'string',
        regex: '^(active|deprecated|beta)$',
        required: true,
        deriveFromData: '(item) => item.status'
      }
    }
  },
  dataFormat: 'jsonl'
});
```

**Domain Item Structure:**

```jsonl
{
  "rowId": "active.abc123",
  "id": "software-development",
  "name": "Software Development",
  "description": "Quality standards for software development",
  "version": "1.0.0",
  "namespace": "methods-software-development",
  "status": "active",
  "categories": [
    {
      "id": "implementation",
      "name": "Implementation",
      "description": "Code structure and patterns",
      "color": "#4CAF50"
    },
    {
      "id": "testing",
      "name": "Testing",
      "description": "Test coverage and quality",
      "color": "#2196F3"
    }
  ],
  "artifactTypes": [
    {
      "id": "source-code",
      "name": "Source Code",
      "fileExtensions": [".ts", ".js", ".py"]
    }
  ],
  "defaultValidationStrategy": "automated",
  "created_at": "2025-10-11T10:00:00Z",
  "updated_at": "2025-10-11T10:00:00Z"
}
```

## Method Item Storage

### Method Item Schema

```typescript
interface MethodItem {
  // Identity
  rowId: string;              // Partition-aware ID: "category.subject.guid"
  id: string;                 // Human-readable ID: "class-properties-getters"
  subjectName: string;        // "Class", "EmailResponse", etc.

  // Core fields
  description: string;
  category: string;
  required: boolean;

  // Validation
  validationRule: {
    strategy: 'automated' | 'manual' | 'ai-assisted' | 'peer-review' | 'measured';
    description: string;
    automatedCheck?: {
      type: 'regex' | 'function' | 'api';
      configuration: Record<string, any>;
    };
    manualCheck?: {
      reviewerRole?: string;
      reviewChecklist?: string[];
      estimatedTime?: number;
    };
    measurement?: {
      metric: string;
      unit: string;
      threshold?: number | string;
      comparison?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
    };
  };

  // Artifact expectations
  artifactType?: string;
  expectedOutput?: {
    artifactType: string;
    location?: string;
    format?: string;
    size?: { min?: number; max?: number; unit: string; };
  };

  // Guidance
  tips?: string[];
  example?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}
```

### Example: Software Development Method Items

```jsonl
{"rowId":"implementation.Class.a3f7b9e1","id":"class-properties-getters","subjectName":"Class","description":"Properties that hold state should use getters/setters, not get*/set* methods","category":"implementation","required":true,"validationRule":{"strategy":"automated","description":"Check for get*/set* method patterns","automatedCheck":{"type":"regex","configuration":{"pattern":"\\bget[A-Z].*\\(\\)|\\bset[A-Z].*\\(","shouldNotMatch":true}}},"artifactType":"source-code","tips":["Use getter/setter syntax for state properties","Only use get*/set* for computed values"],"example":"Use `get name()` instead of `getName()`","created_at":"2025-10-11T10:00:00Z","updated_at":"2025-10-11T10:00:00Z"}
{"rowId":"documentation.Class.7e9f2a4c","id":"class-docstrings","subjectName":"Class","description":"All classes should have docstrings with @param and @returns","category":"documentation","required":true,"validationRule":{"strategy":"automated","description":"Check for JSDoc comments with @param and @returns","automatedCheck":{"type":"regex","configuration":{"pattern":"\\/\\*\\*[\\s\\S]*?@param[\\s\\S]*?@returns","location":"above-class-definition"}}},"artifactType":"source-code","tips":["Use JSDoc format","Include parameter descriptions","Document return values"],"created_at":"2025-10-11T10:00:00Z","updated_at":"2025-10-11T10:00:00Z"}
{"rowId":"testing.Class.b5c8d1e3","id":"class-unit-tests","subjectName":"Class","description":"Write unit tests for each public method","category":"testing","required":true,"validationRule":{"strategy":"measured","description":"Measure test coverage for the class","measurement":{"metric":"code-coverage","unit":"percentage","threshold":80,"comparison":"gte"}},"artifactType":"test-code","tips":["Test one thing at a time","Mock dependencies","Test edge cases"],"created_at":"2025-10-11T10:00:00Z","updated_at":"2025-10-11T10:00:00Z"}
```

### Example: Customer Service Method Items

```jsonl
{"rowId":"communication.EmailResponse.9a1c3e5f","id":"email-greeting-personalized","subjectName":"EmailResponse","description":"Email addresses customer by name","category":"communication","required":true,"validationRule":{"strategy":"automated","description":"Check that email greeting includes customer name","automatedCheck":{"type":"regex","configuration":{"pattern":"(Dear|Hi|Hello)\\s+\\w+","location":"first-paragraph"}}},"artifactType":"email","tips":["Use customer's preferred name if known","Avoid generic greetings like 'Dear Customer'"],"created_at":"2025-10-11T10:00:00Z","updated_at":"2025-10-11T10:00:00Z"}
{"rowId":"empathy.EmailResponse.c2d4e6f8","id":"email-acknowledge-concern","subjectName":"EmailResponse","description":"Explicitly acknowledges the customer's specific concern","category":"empathy","required":true,"validationRule":{"strategy":"ai-assisted","description":"AI checks that response specifically addresses customer issue","automatedCheck":{"type":"api","configuration":{"endpoint":"ai-validator","model":"gpt-4","prompt":"Does this email specifically acknowledge and address the customer's concern from their original message?"}}},"tips":["Reference specific details from their message","Show you understand their frustration/concern"],"created_at":"2025-10-11T10:00:00Z","updated_at":"2025-10-11T10:00:00Z"}
{"rowId":"compliance.EmailResponse.e3f5a7b9","id":"email-response-time","subjectName":"EmailResponse","description":"Response sent within 24 hours","category":"compliance","required":true,"validationRule":{"strategy":"measured","description":"Measure time between customer email and response","measurement":{"metric":"response-time","unit":"hours","threshold":24,"comparison":"lte"}},"artifactType":"email","created_at":"2025-10-11T10:00:00Z","updated_at":"2025-10-11T10:00:00Z"}
```

## Working with Method Items

### Creating Method Items

```typescript
import {
  NamespaceManager,
  RowIdGenerator,
  JsonlRowStorage
} from '@digital-minion/data';

const manager = new NamespaceManager({ basePath: './data' });
const generator = new RowIdGenerator();
const storage = new JsonlRowStorage();

// Load domain metadata
const metadata = await metadataManager.loadMetadata('./data', 'methods-software-development');

// Create a method item
const methodItem = {
  id: 'class-properties-getters',
  subjectName: 'Class',
  description: 'Properties that hold state should use getters/setters',
  category: 'implementation',
  required: true,
  validationRule: {
    strategy: 'automated',
    description: 'Check for get*/set* method patterns',
    automatedCheck: {
      type: 'regex',
      configuration: {
        pattern: '\\bget[A-Z].*\\(\\)|\\bset[A-Z].*\\(',
        shouldNotMatch: true
      }
    }
  },
  artifactType: 'source-code',
  tips: ['Use getter/setter syntax for state properties'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Generate rowId
const rowId = generator.generateRowIdFromItem(metadata, methodItem);
const methodItemWithId = { ...methodItem, rowId };

// Validate write
const validation = await manager.validateWrite('methods-software-development', methodItemWithId);
// Result: partitionPath = "category=implementation/subject=Class"

// Ensure partition exists
await manager.ensurePartitionExists(
  'methods-software-development',
  validation.partitionPath!,
  'jsonl'
);

// Write to partition
const filePath = manager.getPartitionFilePath(
  'methods-software-development',
  validation.partitionPath!,
  'jsonl'
);
await storage.appendRow(filePath, methodItemWithId);
```

### Looking Up Method Items by RowId

```typescript
import { RowIdResolver } from '@digital-minion/data';

const resolver = new RowIdResolver({ basePath: './data' });

// O(1) lookup by rowId
const result = await resolver.lookupByRowId(
  'methods-software-development',
  'implementation.Class.a3f7b9e1-c5d2-4a8b-9e7f-1c3a5b7d9e2f'
);

if (result.found) {
  console.log('Method Item:', result.item);
  console.log('Partition:', result.parsedRowId.partitionPath);
  console.log('Lookup time:', result.lookupTime, 'ms');
}

// Batch lookup multiple method items
const rowIds = [
  'implementation.Class.a3f7b9e1',
  'documentation.Class.7e9f2a4c',
  'testing.Class.b5c8d1e3'
];

const results = await resolver.lookupManyByRowId('methods-software-development', rowIds);

for (const [rowId, result] of results.entries()) {
  if (result.found) {
    console.log(`${result.item.id}: ${result.item.description}`);
  }
}
```

### Querying Method Items by Subject

```typescript
// Query all method items for "Class" subject
const partitions = await manager.resolveQueryPartitions('methods-software-development', {
  partitionFilter: { subject: 'Class' }
});

// Returns all partitions:
// ["category=implementation/subject=Class", "category=documentation/subject=Class", "category=testing/subject=Class"]

// Load items from all partitions
for (const partition of partitions) {
  const filePath = manager.getPartitionFilePath('methods-software-development', partition, 'jsonl');
  const items = await storage.readAll(filePath);
  console.log(`${partition}: ${items.length} method items`);
}
```

### Querying Method Items by Category

```typescript
// Query all "testing" method items across all subjects
const partitions = await manager.resolveQueryPartitions('methods-software-development', {
  partitionFilter: { category: 'testing' }
});

// Returns: ["category=testing/subject=Class", "category=testing/subject=Interface", ...]

// Use DataLayer for advanced queries
import { DataLayer } from '@digital-minion/data';

const dataLayer = new DataLayer({
  basePath: './data',
  collection: 'methods-software-development',
  adapterType: 'jsonl',
  enableCaching: true
});

await dataLayer.initialize();

// Query with filters
const testingMethods = await dataLayer.query({
  filters: {
    category: 'testing',
    required: true
  },
  sort: { field: 'subjectName', direction: 'asc' }
});

console.log('Found:', testingMethods.data.length, 'required testing methods');
```

## Subject Management

### Subject as Virtual Collection

A **subject** is a virtual collection of method items across multiple partitions. We track subjects in a separate manifest:

```typescript
// data/method-subjects/namespace.meta.json
await metadataManager.createNamespace({
  namespace: 'method-subjects',
  basePath: './data',
  partitionSchema: {
    order: ['domain', 'status'],
    partitions: {
      domain: {
        type: 'string',
        regex: '^[a-z-]+$',
        required: true,
        deriveFromData: '(item) => item.domainId'
      },
      status: {
        type: 'string',
        regex: '^(active|deprecated|draft)$',
        required: true,
        deriveFromData: '(item) => item.status'
      }
    }
  },
  dataFormat: 'jsonl'
});
```

### Subject Item Structure

```jsonl
{"rowId":"software-development.active.abc123","id":"Class","domainId":"software-development","name":"Class","description":"Implementation rules for creating classes","status":"active","tags":["programming","oop","structure"],"methodItemRowIds":["implementation.Class.a3f7b9e1","documentation.Class.7e9f2a4c","testing.Class.b5c8d1e3","organization.Class.c4d5e6f7"],"statistics":{"totalMethodItems":4,"requiredItems":3,"categories":{"implementation":1,"documentation":1,"testing":1,"organization":1}},"created_at":"2025-10-11T10:00:00Z","updated_at":"2025-10-11T10:00:00Z"}
{"rowId":"customer-service.active.def456","id":"EmailResponse","domainId":"customer-service","name":"Email Response","description":"Quality standards for customer email responses","status":"active","tags":["email","communication","customer-service"],"methodItemRowIds":["communication.EmailResponse.9a1c3e5f","empathy.EmailResponse.c2d4e6f8","compliance.EmailResponse.e3f5a7b9","professionalism.EmailResponse.f4g6h8i0"],"statistics":{"totalMethodItems":4,"requiredItems":4,"categories":{"communication":1,"empathy":1,"compliance":1,"professionalism":1}},"created_at":"2025-10-11T10:00:00Z","updated_at":"2025-10-11T10:00:00Z"}
```

### Loading a Complete Subject

```typescript
// Load subject metadata
const subjectResult = await resolver.lookupByRowId(
  'method-subjects',
  'software-development.active.abc123'
);

const subject = subjectResult.item;

// Load all method items for this subject
const methodItems = await resolver.lookupManyByRowId(
  'methods-software-development',
  subject.methodItemRowIds
);

console.log(`Subject: ${subject.name}`);
console.log(`Method Items: ${methodItems.size}`);

for (const [rowId, result] of methodItems.entries()) {
  if (result.found) {
    console.log(`  - ${result.item.id}: ${result.item.description}`);
  }
}
```

## Integration with Todo System

### Todo References Method Items by RowId

When a todo is created for a subject, it stores references to method item rowIds:

```typescript
// data/todos/namespace.meta.json
await metadataManager.createNamespace({
  namespace: 'todos',
  basePath: './data',
  partitionSchema: {
    order: ['year', 'month', 'status'],
    partitions: {
      year: { type: 'string', regex: '^\\d{4}$', required: true },
      month: { type: 'string', regex: '^(0[1-9]|1[0-2])$', required: true },
      status: {
        type: 'string',
        regex: '^(pending|in-progress|completed)$',
        required: true
      }
    }
  },
  dataFormat: 'jsonl'
});
```

### Todo Item with Method References

```jsonl
{
  "rowId": "2025.10.pending.todo123",
  "id": "todo-implement-user-class",
  "title": "Implement User class",
  "description": "Create a User class with validation",
  "status": "pending",
  "created_at": "2025-10-15T10:00:00Z",
  "updated_at": "2025-10-15T10:00:00Z",

  "methodContext": {
    "domain": "software-development",
    "subjectRowId": "software-development.active.abc123",
    "subjectName": "Class",
    "methodItemRowIds": [
      "implementation.Class.a3f7b9e1",
      "documentation.Class.7e9f2a4c",
      "testing.Class.b5c8d1e3",
      "organization.Class.c4d5e6f7"
    ]
  },

  "checklist": [
    {
      "methodItemRowId": "implementation.Class.a3f7b9e1",
      "description": "Properties use getters/setters",
      "required": true,
      "completed": false,
      "validationResult": null
    },
    {
      "methodItemRowId": "documentation.Class.7e9f2a4c",
      "description": "Class has docstrings",
      "required": true,
      "completed": false,
      "validationResult": null
    },
    {
      "methodItemRowId": "testing.Class.b5c8d1e3",
      "description": "Unit tests written",
      "required": true,
      "completed": false,
      "validationResult": null
    },
    {
      "methodItemRowId": "organization.Class.c4d5e6f7",
      "description": "Placed in correct namespace",
      "required": true,
      "completed": false,
      "validationResult": null
    }
  ]
}
```

### Loading Todo with Method Details

```typescript
// Load todo
const todoResult = await resolver.lookupByRowId('todos', '2025.10.pending.todo123');
const todo = todoResult.item;

// Load all referenced method items
const methodItems = await resolver.lookupManyByRowId(
  'methods-software-development',
  todo.methodContext.methodItemRowIds
);

// Enrich checklist with full method item details
const enrichedChecklist = todo.checklist.map(checklistItem => ({
  ...checklistItem,
  methodItem: methodItems.get(checklistItem.methodItemRowId)?.item
}));

console.log('Todo:', todo.title);
console.log('Checklist:');
enrichedChecklist.forEach((item, index) => {
  console.log(`  ${index + 1}. ${item.methodItem?.description}`);
  console.log(`     Required: ${item.required}, Completed: ${item.completed}`);
  console.log(`     Validation: ${item.methodItem?.validationRule.strategy}`);
});
```

## Validation Results Storage

### Validation Results Namespace

Track validation attempts and results separately:

```typescript
// data/validation-results/namespace.meta.json
await metadataManager.createNamespace({
  namespace: 'validation-results',
  basePath: './data',
  partitionSchema: {
    order: ['year', 'month', 'domain'],
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
      domain: {
        type: 'string',
        regex: '^[a-z-]+$',
        required: true,
        deriveFromData: '(item) => item.domainId'
      }
    }
  },
  dataFormat: 'jsonl'
});
```

### Validation Result Item

```jsonl
{
  "rowId": "2025.10.software-development.result123",
  "methodItemRowId": "implementation.Class.a3f7b9e1",
  "todoRowId": "2025.10.pending.todo123",
  "domainId": "software-development",
  "resultType": "boolean",
  "passed": true,
  "timestamp": "2025-10-15T14:30:00Z",
  "validator": "automated-checker",
  "evidence": [
    {
      "type": "code-snippet",
      "location": "src/models/User.ts:15-25",
      "description": "Found getter/setter usage for 'name' property",
      "metadata": {
        "pattern": "get name()",
        "lineNumber": 18
      }
    }
  ],
  "notes": "All properties use getter/setter syntax",
  "confidence": 0.95
}
```

## Analytics and Statistics

### Method Usage Analytics

Use DataLayer's map-reduce for analytics:

```typescript
const dataLayer = new DataLayer({
  basePath: './data',
  collection: 'validation-results',
  adapterType: 'jsonl'
});

await dataLayer.initialize();

// Most commonly validated method items
const usageStats = await dataLayer.mapReduce({
  map: (result) => [[result.methodItemRowId, 1]],
  reduce: (methodItemRowId, counts) => counts.reduce((a, b) => a + b, 0)
});

console.log('Method Item Usage:');
Object.entries(usageStats)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10)
  .forEach(([rowId, count]) => {
    console.log(`  ${rowId}: ${count} validations`);
  });

// Success rate by method item
const successRates = await dataLayer.mapReduce({
  map: (result) => [
    [result.methodItemRowId, { passed: result.passed ? 1 : 0, total: 1 }]
  ],
  reduce: (methodItemRowId, results) => {
    const passed = results.reduce((sum, r) => sum + r.passed, 0);
    const total = results.reduce((sum, r) => sum + r.total, 0);
    return { passed, total, rate: passed / total };
  }
});

console.log('Success Rates:');
Object.entries(successRates).forEach(([rowId, stats]) => {
  console.log(`  ${rowId}: ${(stats.rate * 100).toFixed(1)}% (${stats.passed}/${stats.total})`);
});
```

## Domain Package Distribution

### Exporting a Domain as a Package

```typescript
// Export all data for a domain
const domainExporter = {
  async exportDomain(domainId: string, outputPath: string) {
    // 1. Export domain definition
    const domainResult = await resolver.lookupByRowId('method-domains', `active.${domainId}`);

    // 2. Export all subjects for this domain
    const subjectPartitions = await manager.resolveQueryPartitions('method-subjects', {
      partitionFilter: { domain: domainId }
    });

    const subjects = [];
    for (const partition of subjectPartitions) {
      const filePath = manager.getPartitionFilePath('method-subjects', partition, 'jsonl');
      const items = await storage.readAll(filePath);
      subjects.push(...items);
    }

    // 3. Export all method items for this domain
    const methodPartitions = await manager.resolveQueryPartitions(
      `methods-${domainId}`,
      {}  // All partitions
    );

    const methodItems = [];
    for (const partition of methodPartitions) {
      const filePath = manager.getPartitionFilePath(`methods-${domainId}`, partition, 'jsonl');
      const items = await storage.readAll(filePath);
      methodItems.push(...items);
    }

    // 4. Create package
    const packageData = {
      domain: domainResult.item,
      subjects,
      methodItems,
      version: domainResult.item.version,
      exportedAt: new Date().toISOString()
    };

    // 5. Write package file
    const packageStorage = new JsonObjectStorage();
    await packageStorage.write(
      `${outputPath}/domain-${domainId}.package.json`,
      packageData,
      { pretty: true }
    );

    console.log(`Exported domain ${domainId} to ${outputPath}`);
  }
};

// Export software development domain
await domainExporter.exportDomain('software-development', './packages');
```

### Importing a Domain Package

```typescript
const domainImporter = {
  async importDomain(packagePath: string) {
    const packageStorage = new JsonObjectStorage();
    const packageData = await packageStorage.read(packagePath);

    // 1. Create domain namespace
    await metadataManager.createNamespace({
      namespace: `methods-${packageData.domain.id}`,
      basePath: './data',
      partitionSchema: methodPartitionSchema,
      dataFormat: 'jsonl'
    });

    // 2. Import method items
    for (const methodItem of packageData.methodItems) {
      const validation = await manager.validateWrite(
        `methods-${packageData.domain.id}`,
        methodItem
      );

      await manager.ensurePartitionExists(
        `methods-${packageData.domain.id}`,
        validation.partitionPath!,
        'jsonl'
      );

      const filePath = manager.getPartitionFilePath(
        `methods-${packageData.domain.id}`,
        validation.partitionPath!,
        'jsonl'
      );

      await storage.appendRow(filePath, methodItem);
    }

    // 3. Import subjects
    for (const subject of packageData.subjects) {
      const validation = await manager.validateWrite('method-subjects', subject);
      await manager.ensurePartitionExists('method-subjects', validation.partitionPath!, 'jsonl');

      const filePath = manager.getPartitionFilePath(
        'method-subjects',
        validation.partitionPath!,
        'jsonl'
      );

      await storage.appendRow(filePath, subject);
    }

    // 4. Register domain
    const domainValidation = await manager.validateWrite('method-domains', packageData.domain);
    await manager.ensurePartitionExists('method-domains', domainValidation.partitionPath!, 'jsonl');

    const domainFilePath = manager.getPartitionFilePath(
      'method-domains',
      domainValidation.partitionPath!,
      'jsonl'
    );

    await storage.appendRow(domainFilePath, packageData.domain);

    console.log(`Imported domain ${packageData.domain.id} (${packageData.methodItems.length} method items)`);
  }
};

// Import from package
await domainImporter.importDomain('./packages/domain-customer-service.package.json');
```

## Benefits of @digital-minion/data Storage

### 1. **Efficient Organization**
- Method items partitioned by category and subject
- O(1) lookups via rowIds
- Query only relevant partitions

### 2. **Scalability**
- Handles unlimited domains, subjects, and method items
- Partitions keep file sizes manageable
- Parallel processing of partitions

### 3. **Flexibility**
- Each domain has its own namespace
- Easy to add/remove domains
- Independent versioning per domain

### 4. **Referential Integrity**
- RowIds act as foreign keys
- Todos reference method items by rowId
- Validation results link back to method items

### 5. **Analytics and Insights**
- Map-reduce for aggregations
- Track usage patterns
- Measure success rates
- Identify problematic method items

### 6. **Distribution**
- Export/import domains as packages
- Share via npm or filesystem
- Version control friendly (JSONL format)

### 7. **Performance**
- O(1) lookups by rowId
- Batch operations group by partition
- Streaming for large result sets
- Optional caching layer

## Migration from Legacy Storage

### Adapter for Current Format

```typescript
class LegacyMethodAdapter {
  async migrateTo DataStorage(legacyManifestPath: string) {
    // Read legacy manifest
    const storage = new JsonObjectStorage();
    const legacyData = await storage.read(legacyManifestPath);

    // Extract domain information
    const domainId = 'software-development';  // Inferred from content

    // Create namespace
    await metadataManager.createNamespace({
      namespace: `methods-${domainId}`,
      basePath: './data',
      partitionSchema: methodPartitionSchema,
      dataFormat: 'jsonl'
    });

    // Migrate subjects and method items
    for (const subject of legacyData.subjects) {
      // Create subject entry
      const subjectRowId = `${domainId}.active.${generateGuid()}`;
      const methodItemRowIds = [];

      // Migrate method items
      for (const method of subject.methods) {
        const methodItem = {
          id: method.id,
          subjectName: subject.name,
          description: method.description,
          category: method.category,
          required: method.required,
          validationRule: {
            strategy: 'automated',  // Inferred
            description: method.validation || '',
            automatedCheck: method.validation ? {
              type: 'custom',
              configuration: { rule: method.validation }
            } : undefined
          },
          tips: method.tips || [],
          example: method.example,
          created_at: method.created_at || new Date().toISOString(),
          updated_at: method.updated_at || new Date().toISOString()
        };

        // Generate rowId and save
        const rowId = generator.generateRowIdFromItem(metadata, methodItem);
        methodItemRowIds.push(rowId);

        const methodItemWithId = { ...methodItem, rowId };
        // ... save to partition ...
      }

      // Create subject with references
      const subjectEntry = {
        rowId: subjectRowId,
        id: subject.name,
        domainId,
        name: subject.name,
        description: subject.description,
        status: 'active',
        methodItemRowIds,
        created_at: subject.created_at,
        updated_at: subject.updated_at
      };

      // ... save subject ...
    }
  }
}
```

## Summary

By leveraging `@digital-minion/data`, the Method system gains:

1. **Partition-based organization** - Category and subject hierarchy
2. **O(1) lookups** - RowIds encode partition location
3. **Domain isolation** - Each domain has its own namespace
4. **Scalable storage** - JSONL files with efficient partitioning
5. **Referential integrity** - RowIds as foreign keys between systems
6. **Analytics capabilities** - Map-reduce for usage insights
7. **Package distribution** - Export/import domains easily
8. **Performance** - Batch operations, streaming, caching

This storage methodology makes the abstract Method system concrete, efficient, and production-ready while maintaining the domain-agnostic design that enables expansion beyond programming.
