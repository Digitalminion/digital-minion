# Standards Data Structure

## Overview

Standards (Policy, Role, Position) are stored at the **team level** alongside functions (projects, matters, maintenance). This creates a unified organizational structure where both work and governance live side-by-side.

## File Structure

```
.minion/local/
└── administrative_unit={unit}/
    └── business_unit={bu}/
        └── organization={org}/
            └── team={team}/
                ├── function=projects/
                │   └── projects.jsonl
                ├── function=matters/
                │   └── matters.jsonl
                ├── function=maintenance/
                │   ├── processes.jsonl
                │   └── tasks.jsonl
                ├── standard=policy/
                │   ├── scope=filesystem/
                │   │   ├── domain=testing/
                │   │   │   └── policies.jsonl
                │   │   ├── domain=development/
                │   │   │   └── policies.jsonl
                │   │   ├── domain=documentation/
                │   │   │   └── policies.jsonl
                │   │   └── domain=security/
                │   │       └── policies.jsonl
                │   ├── scope=api/
                │   │   ├── domain=testing/
                │   │   │   └── policies.jsonl
                │   │   ├── domain=development/
                │   │   │   └── policies.jsonl
                │   │   └── domain=deployment/
                │   │       └── policies.jsonl
                │   ├── scope=service/
                │   │   ├── domain=deployment/
                │   │   │   └── policies.jsonl
                │   │   └── domain=infrastructure/
                │   │       └── policies.jsonl
                │   ├── scope=account/
                │   │   └── domain=management/
                │   │       └── policies.jsonl
                │   └── scope=data/
                │       ├── domain=read/
                │       │   └── policies.jsonl
                │       └── domain=write/
                │           └── policies.jsonl
                ├── standard=role/
                │   ├── domain=testing/
                │   │   ├── level=basic/
                │   │   │   └── roles.jsonl
                │   │   ├── level=standard/
                │   │   │   └── roles.jsonl
                │   │   ├── level=advanced/
                │   │   │   └── roles.jsonl
                │   │   ├── level=oversight/
                │   │   │   └── roles.jsonl
                │   │   └── level=owner/
                │   │       └── roles.jsonl
                │   ├── domain=development/
                │   │   ├── level=basic/
                │   │   │   └── roles.jsonl
                │   │   ├── level=standard/
                │   │   │   └── roles.jsonl
                │   │   ├── level=advanced/
                │   │   │   └── roles.jsonl
                │   │   ├── level=oversight/
                │   │   │   └── roles.jsonl
                │   │   └── level=owner/
                │   │       └── roles.jsonl
                │   ├── domain=documentation/
                │   │   ├── level=basic/
                │   │   │   └── roles.jsonl
                │   │   ├── level=standard/
                │   │   │   └── roles.jsonl
                │   │   ├── level=advanced/
                │   │   │   └── roles.jsonl
                │   │   └── level=owner/
                │   │       └── roles.jsonl
                │   ├── domain=security/
                │   │   ├── level=basic/
                │   │   │   └── roles.jsonl
                │   │   ├── level=standard/
                │   │   │   └── roles.jsonl
                │   │   └── level=advanced/
                │   │       └── roles.jsonl
                │   ├── domain=review/
                │   │   ├── level=standard/
                │   │   │   └── roles.jsonl
                │   │   ├── level=advanced/
                │   │   │   └── roles.jsonl
                │   │   └── level=owner/
                │   │       └── roles.jsonl
                │   ├── domain=deployment/
                │   │   ├── level=basic/
                │   │   │   └── roles.jsonl
                │   │   ├── level=standard/
                │   │   │   └── roles.jsonl
                │   │   └── level=advanced/
                │   │       └── roles.jsonl
                │   └── domain=architecture/
                │       ├── level=standard/
                │       │   └── roles.jsonl
                │       ├── level=advanced/
                │       │   └── roles.jsonl
                │       └── level=owner/
                │           └── roles.jsonl
                ├── standard=position/
                │   ├── track=engineering/
                │   │   └── positions.jsonl
                │   ├── track=quality/
                │   │   └── positions.jsonl
                │   ├── track=documentation/
                │   │   └── positions.jsonl
                │   ├── track=architecture/
                │   │   └── positions.jsonl
                │   ├── track=security/
                │   │   └── positions.jsonl
                │   ├── track=operations/
                │   │   └── positions.jsonl
                │   ├── track=automation/
                │   │   └── positions.jsonl
                │   └── track=services/
                │       └── positions.jsonl
                └── standard=manifest/
                    └── manifest.json
```

## Complete Example

### Example Team Structure

```
.minion/local/
└── administrative_unit=digital-minion/
    └── business_unit=corp/
        └── organization=global-information-security/
            └── team=global-threat-management/
                ├── function=projects/
                │   └── projects.jsonl
                ├── function=matters/
                │   └── matters.jsonl
                ├── function=maintenance/
                │   ├── processes.jsonl
                │   └── tasks.jsonl
                ├── standard=policy/
                │   ├── scope=filesystem/
                │   │   ├── domain=testing/
                │   │   │   └── policies.jsonl
                │   │   └── domain=development/
                │   │       └── policies.jsonl
                │   └── scope=api/
                │       └── domain=deployment/
                │           └── policies.jsonl
                ├── standard=role/
                │   ├── domain=testing/
                │   │   ├── level=basic/
                │   │   │   └── roles.jsonl
                │   │   ├── level=standard/
                │   │   │   └── roles.jsonl
                │   │   └── level=advanced/
                │   │       └── roles.jsonl
                │   └── domain=development/
                │       ├── level=standard/
                │       │   └── roles.jsonl
                │       └── level=advanced/
                │           └── roles.jsonl
                ├── standard=position/
                │   ├── track=engineering/
                │   │   └── positions.jsonl
                │   └── track=quality/
                │       └── positions.jsonl
                └── standard=manifest/
                    └── manifest.json
```

## Partition Schemes

### Standard Type 1: Policy

**Partition Format:** `standard=policy/scope={type}/domain={function}/`

**First Partition: scope**
- `filesystem` - File system access control
- `api` - API endpoint access control
- `service` - Service/infrastructure access control
- `account` - Account/team management access control
- `data` - Data access control
- `deployment` - Deployment operations access control

**Second Partition: domain**
- `testing` - Testing-related policies
- `development` - Development-related policies
- `documentation` - Documentation-related policies
- `security` - Security-related policies
- `deployment` - Deployment-related policies
- `management` - Management-related policies
- `infrastructure` - Infrastructure-related policies
- `read` - Read operations (for data scope)
- `write` - Write operations (for data scope)

**Example Paths:**
```
standard=policy/scope=filesystem/domain=testing/policies.jsonl
standard=policy/scope=api/domain=deployment/policies.jsonl
standard=policy/scope=data/domain=read/policies.jsonl
```

**Example Policy Data:**
```jsonl
{"id":"policy-testing-filesystem-001","name":"Testing Filesystem Access","version":1,"scope":"filesystem","domain":"testing","statements":[{"effect":"Allow","actions":["read:*:*"],"resources":["**/*"],"language":"Can read all files to understand codebase"},{"effect":"Allow","actions":["create:test:*","update:test:*"],"resources":["**/*.test.ts","**/__tests__/**/*"],"language":"Can create and modify test files"}],"createdAt":"2025-10-11T10:00:00Z","updatedAt":"2025-10-11T10:00:00Z"}
```

### Standard Type 2: Role

**Partition Format:** `standard=role/domain={function}/level={progression}/`

**First Partition: domain**
- `testing` - Testing roles
- `development` - Development roles
- `documentation` - Documentation roles
- `security` - Security roles
- `review` - Code review roles
- `deployment` - Deployment roles
- `architecture` - Architecture roles
- `infrastructure` - Infrastructure roles

**Second Partition: level**
- `basic` - Entry level, limited access
- `standard` - Independent work, standard access
- `advanced` - Senior level, elevated access
- `oversight` - Management level, team leadership
- `owner` - Full domain ownership

**Example Paths:**
```
standard=role/domain=testing/level=basic/roles.jsonl
standard=role/domain=development/level=advanced/roles.jsonl
standard=role/domain=security/level=owner/roles.jsonl
```

**Example Role Data:**
```jsonl
{"id":"role-testing-basic-001","name":"BasicTesting","version":1,"domain":"testing","level":"basic","extends":null,"policies":["policy-testing-filesystem-001"],"methods":["Testing"],"description":"Entry-level testing role with read access and test file creation","createdAt":"2025-10-11T10:00:00Z","updatedAt":"2025-10-11T10:00:00Z"}
{"id":"role-testing-standard-001","name":"Testing","version":1,"domain":"testing","level":"standard","extends":"role-testing-basic-001","policies":["policy-testing-filesystem-002","policy-testing-deployment-001"],"methods":["Testing","CodeReview"],"description":"Standard testing role with deployment to staging","createdAt":"2025-10-11T10:00:00Z","updatedAt":"2025-10-11T10:00:00Z"}
```

### Standard Type 3: Position

**Partition Format:** `standard=position/track={career}/`

**Single Partition: track**
- `engineering` - Software engineering positions
- `quality` - Quality assurance positions
- `documentation` - Documentation positions
- `architecture` - Architecture positions
- `security` - Security positions
- `operations` - Operations/DevOps positions
- `management` - Management positions
- `automation` - Automation/process positions
- `services` - Service/infrastructure positions

**Example Paths:**
```
standard=position/track=engineering/positions.jsonl
standard=position/track=quality/positions.jsonl
standard=position/track=security/positions.jsonl
```

**Example Position Data:**
```jsonl
{"id":"position-qa-engineer-001","title":"QA Engineer","version":1,"track":"quality","roles":["role-testing-standard-001","role-code-reviewing-standard-001"],"methods":["Testing","Documentation","CodeReview"],"requiredAttributes":[{"name":"Jest","type":"framework","minProficiency":3},{"name":"TypeScript","type":"skill","minProficiency":3},{"name":"Testing","type":"skill","minProficiency":3}],"description":"Quality assurance engineer focused on testing and code review","createdAt":"2025-10-11T10:00:00Z","updatedAt":"2025-10-11T10:00:00Z"}
{"id":"position-senior-qa-engineer-001","title":"Senior QA Engineer","version":1,"track":"quality","roles":["role-testing-advanced-001","role-code-reviewing-advanced-001"],"methods":["Testing","Documentation","CodeReview","Architecture"],"requiredAttributes":[{"name":"Jest","type":"framework","minProficiency":4},{"name":"TypeScript","type":"skill","minProficiency":4},{"name":"Testing","type":"skill","minProficiency":4}],"description":"Senior QA engineer with advanced testing capabilities and architecture input","createdAt":"2025-10-11T10:00:00Z","updatedAt":"2025-10-11T10:00:00Z"}
```

## Standards Manifest

**Path:** `standard=manifest/manifest.json`

The manifest tracks all discovered standards for the team and provides quick lookup.

**Example Manifest:**
```json
{
  "teamId": "global-threat-management",
  "administrativeUnit": "digital-minion",
  "businessUnit": "corp",
  "organization": "global-information-security",
  "team": "global-threat-management",
  "stats": {
    "totalPolicies": 15,
    "totalRoles": 23,
    "totalPositions": 8
  },
  "discoveredStandards": {
    "policies": [
      {
        "id": "policy-testing-filesystem-001",
        "name": "Testing Filesystem Access",
        "scope": "filesystem",
        "domain": "testing",
        "version": 1,
        "path": "standard=policy/scope=filesystem/domain=testing/policies.jsonl"
      }
    ],
    "roles": [
      {
        "id": "role-testing-basic-001",
        "name": "BasicTesting",
        "domain": "testing",
        "level": "basic",
        "version": 1,
        "path": "standard=role/domain=testing/level=basic/roles.jsonl"
      }
    ],
    "positions": [
      {
        "id": "position-qa-engineer-001",
        "title": "QA Engineer",
        "track": "quality",
        "version": 1,
        "path": "standard=position/track=quality/positions.jsonl"
      }
    ]
  },
  "version": "1.0.0",
  "createdAt": "2025-10-11T10:00:00Z",
  "updatedAt": "2025-10-11T12:30:00Z"
}
```

## Integration with Functions

Standards and functions coexist at the same level in the hierarchy:

```
team=global-threat-management/
├── function=projects/         ← Work items
├── function=matters/          ← Work items
├── function=maintenance/      ← Work items
├── standard=policy/           ← Governance
├── standard=role/             ← Governance
├── standard=position/         ← Governance
└── standard=manifest/         ← Metadata
```

This allows:
1. **Local Standards** - Each team can define their own standards
2. **Shared Standards** - Teams can reference standards from other teams
3. **Unified View** - All team data (work + governance) in one place
4. **Efficient Queries** - Query by standard type or by function type

## Usage Examples

### Example 1: Create Policy

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
      language: 'Can read all files to understand codebase'
    },
    {
      effect: 'Allow',
      actions: ['create:test:*', 'update:test:*'],
      resources: ['**/*.test.ts', '**/__tests__/**/*'],
      language: 'Can create and modify test files'
    }
  ]
});

// Stored at: standard=policy/scope=filesystem/domain=testing/policies.jsonl
```

### Example 2: Create Role

```typescript
const role = await manager.createRole({
  name: 'Testing',
  domain: 'testing',
  level: 'standard',
  extends: 'role-testing-basic-001', // Inherit from BasicTesting
  policies: [
    'policy-testing-filesystem-002',
    'policy-testing-deployment-001'
  ],
  methods: ['Testing', 'CodeReview']
});

// Stored at: standard=role/domain=testing/level=standard/roles.jsonl
```

### Example 3: Create Position

```typescript
const position = await manager.createPosition({
  title: 'QA Engineer',
  track: 'quality',
  roles: [
    'role-testing-standard-001',
    'role-code-reviewing-standard-001'
  ],
  methods: ['Testing', 'Documentation', 'CodeReview'],
  requiredAttributes: [
    { name: 'Jest', type: 'framework', minProficiency: 3 },
    { name: 'TypeScript', type: 'skill', minProficiency: 3 },
    { name: 'Testing', type: 'skill', minProficiency: 3 }
  ]
});

// Stored at: standard=position/track=quality/positions.jsonl
```

### Example 4: Check Access

```typescript
const result = await manager.checkAccess(
  {
    entityId: 'entity-123',
    action: 'create:test:unit',
    resource: 'packages/core/src/__tests__/user.test.ts'
  },
  'position-qa-engineer-001'
);

if (result.allowed) {
  console.log('Access granted:', result.reason);
  if (result.warnings) {
    result.warnings.forEach(w => console.warn('Warning:', w));
  }
} else {
  console.log('Access denied:', result.reason);
}
```

## Benefits of This Structure

1. **Team Autonomy** - Each team manages their own standards
2. **Consistent Organization** - Standards follow same partition pattern as functions
3. **Efficient Queries** - Query by standard type, scope, domain, etc.
4. **Clear Hierarchy** - Standards at team level, applied to entities
5. **Version Control** - Each standard has version tracking
6. **Discoverability** - Manifest provides quick lookup
7. **Scalability** - Partition structure prevents large flat files

## Path Resolution

The `StandardsManager` provides helper methods to resolve partition paths:

```typescript
// Get policy path
manager.getPolicyPath('filesystem', 'testing');
// → ".minion/local/administrative_unit=.../standard=policy/scope=filesystem/domain=testing/policies.jsonl"

// Get role path
manager.getRolePath('testing', 'basic');
// → ".minion/local/administrative_unit=.../standard=role/domain=testing/level=basic/roles.jsonl"

// Get position path
manager.getPositionPath('quality');
// → ".minion/local/administrative_unit=.../standard=position/track=quality/positions.jsonl"

// Get manifest path
manager.getManifestPath();
// → ".minion/local/administrative_unit=.../standard=manifest/manifest.json"
```
