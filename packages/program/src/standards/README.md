# Standards System - Implementation Summary

## What Was Created

A complete standards data structure that integrates at the **team level** alongside functions (projects, matters, maintenance). This allows each team to define and manage their own governance standards (policies, roles, positions) in the same hierarchical structure as their work items.

## File Structure Created

```
packages/program/src/standards/
├── types.ts              # Complete TypeScript type definitions
├── standards-manager.ts  # Manager for creating and querying standards
├── examples.ts           # Complete working examples
├── index.ts              # Package exports
├── STANDARDS.md          # Original standards documentation
├── STRUCTURE.md          # Detailed partition structure documentation
└── README.md            # This file
```

## Integration at Team Level

### Before (Functions Only)
```
.minion/local/
└── administrative_unit=digital-minion/
    └── business_unit=corp/
        └── organization=global-information-security/
            └── team=global-threat-management/
                ├── function=projects/projects.jsonl
                ├── function=matters/matters.jsonl
                └── function=maintenance/
                    ├── processes.jsonl
                    └── tasks.jsonl
```

### After (Functions + Standards)
```
.minion/local/
└── administrative_unit=digital-minion/
    └── business_unit=corp/
        └── organization=global-information-security/
            └── team=global-threat-management/
                ├── function=projects/projects.jsonl
                ├── function=matters/matters.jsonl
                ├── function=maintenance/
                │   ├── processes.jsonl
                │   └── tasks.jsonl
                ├── standard=policy/
                │   ├── scope=filesystem/
                │   │   ├── domain=testing/policies.jsonl
                │   │   ├── domain=development/policies.jsonl
                │   │   └── domain=security/policies.jsonl
                │   ├── scope=api/
                │   │   └── domain=deployment/policies.jsonl
                │   └── scope=service/
                │       └── domain=deployment/policies.jsonl
                ├── standard=role/
                │   ├── domain=testing/
                │   │   ├── level=basic/roles.jsonl
                │   │   ├── level=standard/roles.jsonl
                │   │   └── level=advanced/roles.jsonl
                │   └── domain=development/
                │       ├── level=standard/roles.jsonl
                │       └── level=advanced/roles.jsonl
                ├── standard=position/
                │   ├── track=engineering/positions.jsonl
                │   └── track=quality/positions.jsonl
                └── standard.manifest.json
```

## Key Features

### 1. Three Standard Types

**Policy** - Granular permission rules
- Partitioned by: `scope` (filesystem, api, service, etc.) and `domain` (testing, development, etc.)
- Contains: Allow/Deny/Warn statements for actions on resources
- Example: "Testing Filesystem Access" policy allows reading all files and creating tests

**Role** - Functional capability with inheritance
- Partitioned by: `domain` (testing, development, etc.) and `level` (basic, standard, advanced, etc.)
- Contains: Policy references, method requirements, parent role
- Supports: Inheritance chain where child roles override parent policies
- Example: "Testing" role extends "BasicTesting" and adds staging deployment

**Position** - Job definition combining roles
- Partitioned by: `track` (engineering, quality, architecture, etc.)
- Contains: Multiple role references, method requirements, attribute requirements
- Example: "Senior QA Engineer" combines advanced testing and code reviewing roles

### 2. Partition Structure

Uses Hive-style partitioning (`key=value`) for efficient organization:

```
standard={type}/         # policy, role, or position
  [partition1]={value}/  # scope/domain for policy, domain/level for role, track for position
    [partition2]={value}/
      data.jsonl         # Actual standard data
```

### 3. Inheritance System

Roles support inheritance for progressive capability building:

```
BasicTesting (can read, create tests)
  ↓ extends
Testing (+ can delete tests, deploy to staging)
  ↓ extends
AdvancedTesting (+ can deploy to production)
```

Child roles can override parent policies:
- Parent says Deny → Child says Allow → Result: Allow for child
- Enables progressive permissions without duplicating all rules

### 4. Access Control

The `StandardsManager` provides complete access checking:

```typescript
const result = await manager.checkAccess(
  {
    entityId: 'qa-engineer-001',
    action: 'create:test:unit',
    resource: 'packages/core/__tests__/user.test.ts'
  },
  'position-qa-engineer-001'
);

// Result includes:
// - allowed: boolean
// - effect: Allow | Deny | Warn
// - matchingStatements: PolicyStatement[]
// - warnings?: string[]
// - reason: string
```

## Usage Examples

### Create a Policy

```typescript
import { StandardsManager } from '@digital-minion/program';

const manager = new StandardsManager({
  basePath: './.minion/local',
  administrativeUnit: 'digital-minion',
  businessUnit: 'corp',
  organization: 'global-information-security',
  team: 'global-threat-management'
});

const policy = await manager.createPolicy({
  name: 'Testing Filesystem Access',
  scope: 'filesystem',
  domain: 'testing',
  statements: [
    {
      effect: 'Allow',
      actions: ['read:*:*'],
      resources: ['**/*'],
      language: 'Can read all files'
    }
  ]
});

// Stored at: standard=policy/scope=filesystem/domain=testing/policies.jsonl
```

### Create a Role

```typescript
const role = await manager.createRole({
  name: 'Testing',
  domain: 'testing',
  level: 'standard',
  extends: 'role-basic-testing-001',
  policies: ['policy-testing-filesystem-001'],
  methods: ['Testing', 'CodeReview']
});

// Stored at: standard=role/domain=testing/level=standard/roles.jsonl
```

### Create a Position

```typescript
const position = await manager.createPosition({
  title: 'QA Engineer',
  track: 'quality',
  roles: ['role-testing-standard-001'],
  methods: ['Testing', 'CodeReview'],
  requiredAttributes: [
    { name: 'Jest', type: 'framework', minProficiency: 3 },
    { name: 'TypeScript', type: 'skill', minProficiency: 3 }
  ]
});

// Stored at: standard=position/track=quality/positions.jsonl
```

### Resolve Position with Full Hierarchy

```typescript
const resolved = await manager.resolvePosition('position-senior-qa-001');

// Returns:
// - All roles from the position
// - All policies from all roles (with inheritance)
// - All methods from all roles
// - Full inheritance chain
```

### Check Access

```typescript
const canDeploy = await manager.checkAccess(
  {
    entityId: 'entity-123',
    action: 'deploy:service:staging',
    resource: 'staging/user-service'
  },
  'position-qa-engineer-001'
);

if (canDeploy.allowed) {
  console.log('Deployment allowed:', canDeploy.reason);
} else {
  console.log('Deployment denied:', canDeploy.reason);
}
```

## Path Resolution Helpers

The manager provides helper methods for partition paths:

```typescript
// Get policy path
manager.getPolicyPath('filesystem', 'testing');
// → ".minion/local/.../standard=policy/scope=filesystem/domain=testing/policies.jsonl"

// Get role path
manager.getRolePath('testing', 'basic');
// → ".minion/local/.../standard=role/domain=testing/level=basic/roles.jsonl"

// Get position path
manager.getPositionPath('quality');
// → ".minion/local/.../standard=position/track=quality/positions.jsonl"

// Get manifest path
manager.getManifestPath();
// → ".minion/local/.../standard.manifest.json"
```

## Benefits

1. **Team Autonomy** - Each team manages their own standards
2. **Consistent Organization** - Standards use same partition pattern as functions
3. **Efficient Queries** - Query by standard type, scope, domain, level, track
4. **Clear Hierarchy** - Standards at team level, applied to entities
5. **Version Control** - Each standard has version tracking
6. **Inheritance** - Progressive capability building with role inheritance
7. **Access Control** - Complete permission checking with Allow/Deny/Warn
8. **Discoverability** - Manifest provides quick lookup of all standards
9. **Scalability** - Partition structure prevents large flat files

## Integration with Data Package

The standards system is designed to work with the `@digital-minion/data` package:

```typescript
import { NamespaceMetadataManager } from '@digital-minion/data';

// Create namespace for policies
await metadataManager.createNamespace({
  namespace: 'policies',
  basePath: './.minion/local/administrative_unit=.../team=.../standard=policy',
  partitionSchema: {
    order: ['scope', 'domain'],
    partitions: {
      scope: {
        type: 'string',
        regex: '^[a-z]+$',
        required: true
      },
      domain: {
        type: 'string',
        regex: '^[a-z]+$',
        required: true
      }
    }
  },
  dataFormat: 'jsonl'
});
```

## Next Steps

To fully integrate the standards system:

1. **Connect to Data Layer** - Use `JsonlRowStorage` and `DataLayer` from `@digital-minion/data`
2. **Implement Entity System** - Create entities (humans, AI agents, services, processes) that reference positions
3. **Build Access Middleware** - Create middleware that checks access before operations
4. **Add Versioning** - Implement version tracking and migration for standards
5. **Create CLI Commands** - Add commands to create/list/update standards
6. **Build UI** - Create interface for managing standards

## Example Complete Setup

See `examples.ts` for complete working examples including:

- `createTestingStandards()` - Complete testing hierarchy (policies → roles → positions)
- `createDevelopmentStandards()` - Complete development hierarchy
- `demonstrateAccessControl()` - Access checking examples
- `setupCompleteTeamStandards()` - Full team setup

Run the complete setup:

```typescript
import { setupCompleteTeamStandards } from '@digital-minion/program';

const result = await setupCompleteTeamStandards();
console.log('Setup complete:', result.manifest);
```

## Documentation Files

- **STANDARDS.md** - Original standards system documentation with detailed explanations
- **STRUCTURE.md** - Complete partition structure documentation with examples
- **types.ts** - All TypeScript type definitions with JSDoc comments
- **standards-manager.ts** - Implementation of StandardsManager class
- **examples.ts** - Working examples of creating and using standards
- **README.md** - This summary document

## Summary

You now have a complete standards data structure that:
- Lives at the team level alongside functions
- Uses partition structure for efficient organization
- Supports Policy → Role → Position hierarchy
- Includes role inheritance with override capabilities
- Provides complete access control checking
- Integrates with the existing data package patterns
- Includes comprehensive examples and documentation

The standards system is ready to be integrated with storage, entities, and access control middleware!
