# Standards System

## Purpose

The Standards system defines **enterprise-wide rules and structures** that govern how work is done, who can do what, and what positions exist in the organization. These standards are versioned, reusable, and separate from individual entity data.

## Core Concept

Standards are composed of three layers that build on each other:

```
Policy (granular permissions)
  ↓ referenced by
Role (functional capability with inheritance)
  ↓ referenced by
Position (job definition)
  ↓ referenced by
Entity (individual person or AI)
```

**Key Insight:** Standards are defined once and reused many times. An entity references a position, which references roles, which reference policies. This creates a clear chain of authority and permissions.

## Universal Entity Model

This system is designed as an **abstract structure** that can organize and govern any type of actor in your organization, not just humans and AI agents.

### What Can Be an Entity?

**1. AI Agents**
- Claude, GPT, custom AI models
- Have capabilities (trained on specific domains)
- Need permissions (what they can access/modify)
- Track activity (tokens used, tasks completed)
- Follow standards (methods for quality work)

**Example:** Claude-QA-1 is an AI agent with the "Senior QA Engineer" position, allowing it to write tests, review code, and deploy to staging.

**2. Humans**
- Employees, contractors, volunteers
- Have skills and certifications
- Need permissions (what they can access/modify)
- Track activity (commits, reviews, deploys)
- Follow standards (methods for quality work)

**Example:** Alice is a human with the "Senior QA Engineer" position, with the same permissions and responsibilities as Claude-QA-1.

**3. Services**
- Microservices, APIs, daemons
- Have capabilities (what APIs they expose, what they can do)
- Need permissions (what databases they can access, what services they can call)
- Track activity (requests handled, errors, uptime)
- Follow standards (API contracts, data validation rules)

**Example:** UserService is a service with the "Backend Service" position, allowing it to read/write user data, call authentication APIs, but not access payment systems.

**4. Processes**
- CI/CD pipelines, cron jobs, automation scripts
- Have capabilities (what steps they can execute)
- Need permissions (what they can deploy, what they can modify)
- Track activity (pipeline runs, success/failure, duration)
- Follow standards (deployment procedures, testing requirements)

**Example:** CI-Pipeline-Main is a process with the "Deployment Automation" position, allowing it to run tests, build artifacts, and deploy to staging, but requiring manual approval for production.

### Why This Abstraction Works

**Common Patterns:**
```
All entities need:
├─ Identity (who/what they are)
├─ Capabilities (what they can do)
├─ Permissions (what they're allowed to do)
├─ Standards (how they should do it)
└─ Activity tracking (what they've done)
```

**Service Example:**
```json
{
  "id": "user-service-001",
  "name": "User Service",
  "type": "service",
  "positionId": "backend-service",
  "attributes": [
    { "name": "User Management", "type": "domain-knowledge", "proficiency": 5 },
    { "name": "PostgreSQL", "type": "framework", "proficiency": 5 },
    { "name": "REST API", "type": "skill", "proficiency": 5 }
  ]
}
```

**Position: Backend Service**
```json
{
  "id": "backend-service",
  "title": "Backend Service",
  "track": "services",
  "roles": ["data-access", "api-provider"],
  "methods": ["ServiceDesign", "APIContract", "DataValidation"]
}
```

**Policies for Services:**
```json
{
  "id": "user-service-database-policy",
  "name": "User Service Database Access",
  "statements": [
    {
      "effect": "Allow",
      "actions": ["read:database:users", "write:database:users"],
      "resources": ["postgres://users-db/users", "postgres://users-db/profiles"],
      "language": "Can read and write to users and profiles tables"
    },
    {
      "effect": "Deny",
      "actions": ["read:database:payments", "write:database:payments"],
      "resources": ["postgres://payments-db/*"],
      "language": "Cannot access payment database - separation of concerns"
    }
  ]
}
```

**Process Example:**
```json
{
  "id": "ci-main-pipeline",
  "name": "Main CI/CD Pipeline",
  "type": "process",
  "positionId": "deployment-automation",
  "attributes": [
    { "name": "Jest", "type": "framework", "proficiency": 5 },
    { "name": "Docker", "type": "framework", "proficiency": 5 },
    { "name": "GitHub Actions", "type": "framework", "proficiency": 5 }
  ]
}
```

**Position: Deployment Automation**
```json
{
  "id": "deployment-automation",
  "title": "Deployment Automation",
  "track": "automation",
  "roles": ["testing", "building", "staging-deployment"],
  "methods": ["Testing", "Building", "Deployment"]
}
```

**Policies for Processes:**
```json
{
  "id": "ci-deployment-policy",
  "name": "CI Pipeline Deployment Policy",
  "statements": [
    {
      "effect": "Allow",
      "actions": ["deploy:service:staging"],
      "resources": ["staging/*"],
      "language": "Can automatically deploy to staging environment"
    },
    {
      "effect": "Warn",
      "actions": ["deploy:service:production"],
      "resources": ["production/*"],
      "language": "Can deploy to production but requires human approval"
    },
    {
      "effect": "Allow",
      "actions": ["read:*:*", "execute:test:*"],
      "resources": ["**/*"],
      "language": "Can read all code and execute all tests"
    }
  ]
}
```

### Benefits of Universal Model

**1. Consistent Governance**
- Same policy model for all actors
- Same RBAC system for all access
- Same audit trail structure
- Unified permission management

**2. Cross-Actor Interactions**
- Humans trigger processes
- Processes call services
- Services use AI agents
- All follow same rules

**3. Simplified Management**
- One system to learn and maintain
- Reuse positions across entity types
- Standard tooling for all entities
- Unified monitoring and tracking

**4. Security and Compliance**
- Consistent security model
- Clear audit trails
- Easy to answer "who/what has access to X?"
- Simplified compliance reporting

**5. Flexible Evolution**
- Easy to add new entity types
- Extend existing positions
- Compose new combinations
- Future-proof architecture

### Entity Type Examples

**AI Agent Position Examples:**
- QA Engineer (writes tests)
- Documentation Writer (maintains docs)
- Code Reviewer (reviews PRs)
- Security Auditor (scans for vulnerabilities)

**Human Position Examples:**
- Developer (writes code)
- Tech Lead (architecture + code + mentoring)
- DevOps Engineer (infrastructure + deployment)
- Product Manager (planning + coordination)

**Service Position Examples:**
- Backend Service (API provider + data access)
- Authentication Service (identity + tokens)
- Payment Service (transactions + sensitive data)
- Notification Service (email + push + SMS)

**Process Position Examples:**
- CI Pipeline (test + build + deploy staging)
- Deployment Pipeline (deploy production with approval)
- Scheduled Backup (backup databases)
- Monitoring Alerts (detect issues + notify)

### Real-World Scenario

**Project: E-commerce Platform**

**Entities:**
```
Humans:
  - Alice (Senior QA Engineer)
  - Bob (Tech Lead)

AI Agents:
  - Claude-Code (Senior Developer)
  - Claude-QA (Senior QA Engineer)

Services:
  - UserService (Backend Service)
  - PaymentService (Payment Service - restricted)
  - OrderService (Backend Service)

Processes:
  - CI-Main (Deployment Automation)
  - Nightly-Backup (Data Backup Automation)
  - Security-Scan (Security Audit Automation)
```

**Unified Permission Model:**
- Alice and Claude-QA both have "Senior QA Engineer" → same permissions
- UserService can access user database but not payment database
- PaymentService has restricted access with extra security policies
- CI-Main can deploy to staging, needs approval for production
- Security-Scan can read everything but cannot modify anything

**Activity Tracking:**
- All entities log activity to same JSONL format
- Alice's commits, Claude-Code's code, UserService's API calls, CI-Main's deployments
- Unified view of "what happened in the system"

**Standards Enforcement:**
- Humans and AI follow same Methods for code quality
- Services follow API contract standards
- Processes follow deployment standards
- Consistent quality across all work

## The Three Standard Types

### 1. Policy - Granular Permission Rules

**Purpose:** Define fine-grained access control using effect, actions, resources, and human-readable explanations.

**Structure:**
```typescript
Policy {
  id: string
  name: string
  statements: Statement[]
}

Statement {
  effect: "Allow" | "Deny" | "Warn"
  actions: string[]      // ["create:typescript:*", "read:*:*"]
  resources: string[]    // ["packages/cli/src/*", "docs/**/*.md"]
  language: string       // Human explanation of this statement
}
```

**Action Format:** `verb:layer:scope`
- **Verb:** create, read, update, delete, list, comment, approve, deploy
- **Layer:** typescript, test, markdown, configuration, etc.
- **Scope:** `*` (all), `types` (specific), `classes`, etc.

**Example Actions:**
- `create:typescript:*` - Create any TypeScript file
- `read:*:*` - Read everything
- `update:test:unit` - Update unit tests only
- `delete:markdown:docs` - Delete markdown in docs
- `deploy:service:staging` - Deploy to staging environment

**Resource Format:** Workspace paths with glob patterns
- `packages/*/src/**/*` - All source in any package
- `docs/**/*.md` - All markdown in docs
- `**/*.test.ts` - All test files anywhere

**Example Policy:**
```json
{
  "id": "basic-testing-filesystem-policy",
  "name": "Basic Testing Filesystem Access",
  "statements": [
    {
      "effect": "Allow",
      "actions": ["read:*:*"],
      "resources": ["**/*"],
      "language": "Can read all files to understand codebase and what needs testing"
    },
    {
      "effect": "Allow",
      "actions": ["create:test:*", "update:test:*"],
      "resources": ["**/*.test.ts", "**/__tests__/**/*"],
      "language": "Can create and modify test files throughout the codebase"
    },
    {
      "effect": "Deny",
      "actions": ["delete:*:*"],
      "resources": ["**/*"],
      "language": "Cannot delete any files - must request assistance from standard Testing role or higher"
    },
    {
      "effect": "Deny",
      "actions": ["create:typescript:*", "update:typescript:*"],
      "resources": ["packages/**/!(*.test).ts"],
      "language": "Cannot modify production code - only test files"
    }
  ]
}
```

### 2. Role - Functional Capability with Inheritance

**Purpose:** Define a functional capability in a specific domain with progressive levels. Roles can extend other roles to inherit and override permissions.

**Structure:**
```typescript
Role {
  id: string
  name: string
  domain: string           // testing, development, documentation, security
  level: string            // basic, standard, advanced, oversight, owner
  extends: string | null   // Parent role ID
  policies: string[]       // Policy IDs
  methods: string[]        // Method subject IDs from MethodManifest
}
```

**Role Naming Convention:** `{Level}{Domain}`
- `BasicTesting`, `Testing`, `AdvancedTesting`, `TestingOversight`, `TestingOwner`
- `BasicDevelopment`, `Development`, `AdvancedDevelopment`, `DevelopmentOversight`, `DevelopmentOwner`
- `BasicDocumentation`, `Documentation`, `AdvancedDocumentation`, `DocumentationOwner`

**Inheritance Rules:**
1. Child role inherits all policies from parent
2. Child can add new policies
3. **Child's explicit policy overrides parent** (Allow overrides Deny, Deny overrides Allow)
4. Methods are additive (child gets parent methods + own methods)

**Example Role Progression:**

```json
{
  "id": "basic-testing",
  "name": "BasicTesting",
  "domain": "testing",
  "level": "basic",
  "extends": null,
  "policies": [
    "basic-testing-filesystem-policy"
  ],
  "methods": ["Testing"]
}
```

```json
{
  "id": "testing",
  "name": "Testing",
  "domain": "testing",
  "level": "standard",
  "extends": "basic-testing",
  "policies": [
    "testing-filesystem-policy",
    "testing-deployment-policy"
  ],
  "methods": ["Testing", "CodeReview"]
}
```

```json
{
  "id": "advanced-testing",
  "name": "AdvancedTesting",
  "domain": "testing",
  "level": "advanced",
  "extends": "testing",
  "policies": [
    "advanced-testing-filesystem-policy",
    "advanced-testing-deployment-policy",
    "testing-team-policy"
  ],
  "methods": ["Testing", "CodeReview", "Documentation"]
}
```

**Policy Override Example:**
```
BasicTesting policy says:
  Deny: delete:*:*

Testing extends BasicTesting and adds:
  Allow: delete:test:*

Result for Testing role:
  ✓ Can delete test files (child Allow overrides parent Deny for tests)
  ✗ Cannot delete other files (parent Deny still applies)
```

### 3. Position - Job Definition

**Purpose:** Define a reusable job/role that combines multiple functional roles and methods. Positions are what entities are assigned to.

**Structure:**
```typescript
Position {
  id: string
  title: string                 // Human-readable job title
  track: string                 // Career track: engineering, quality, documentation
  roles: string[]               // Role IDs (can be multiple)
  methods: string[]             // Method subject IDs (combined from roles + additional)
  requiredAttributes: AttributeRequirement[]
}

AttributeRequirement {
  name: string                  // Attribute name
  type: string                  // skill, certification, framework, domain-knowledge
  minProficiency: number        // 1-5 (for skills)
  mustBeValidated: boolean      // For certifications
}
```

**Example Positions:**

```json
{
  "id": "qa-engineer",
  "title": "QA Engineer",
  "track": "quality",
  "roles": ["testing", "code-reviewing"],
  "methods": ["Testing", "Documentation", "CodeReview"],
  "requiredAttributes": [
    { "name": "Jest", "type": "framework", "minProficiency": 3 },
    { "name": "TypeScript", "type": "skill", "minProficiency": 3 },
    { "name": "Testing", "type": "skill", "minProficiency": 3 }
  ]
}
```

```json
{
  "id": "senior-qa-engineer",
  "title": "Senior QA Engineer",
  "track": "quality",
  "roles": ["advanced-testing", "advanced-code-reviewing"],
  "methods": ["Testing", "Documentation", "CodeReview", "Architecture"],
  "requiredAttributes": [
    { "name": "Jest", "type": "framework", "minProficiency": 4 },
    { "name": "TypeScript", "type": "skill", "minProficiency": 4 },
    { "name": "Testing", "type": "skill", "minProficiency": 4 }
  ]
}
```

```json
{
  "id": "tech-lead",
  "title": "Tech Lead",
  "track": "engineering",
  "roles": ["advanced-development", "advanced-testing", "advanced-code-reviewing", "documentation"],
  "methods": ["Class", "Interface", "Architecture", "Testing", "Documentation", "CodeReview", "Structure"],
  "requiredAttributes": [
    { "name": "TypeScript", "type": "skill", "minProficiency": 5 },
    { "name": "System Design", "type": "skill", "minProficiency": 4 },
    { "name": "Leadership", "type": "skill", "minProficiency": 4 }
  ]
}
```

## File Structure

Standards are stored using **Hive-style partitioning** with `key=value` format for efficient querying and organization.

```
.minion/standards/
├── policy/
│   ├── scope=filesystem/
│   │   ├── domain=testing/
│   │   │   └── testing-filesystem-policies.jsonl
│   │   ├── domain=development/
│   │   │   └── development-filesystem-policies.jsonl
│   │   ├── domain=documentation/
│   │   │   └── documentation-filesystem-policies.jsonl
│   │   └── domain=security/
│   │       └── security-filesystem-policies.jsonl
│   ├── scope=api/
│   │   ├── domain=testing/
│   │   ├── domain=development/
│   │   └── domain=deployment/
│   ├── scope=service/
│   │   ├── domain=deployment/
│   │   │   └── deployment-service-policies.jsonl
│   │   └── domain=infrastructure/
│   └── scope=account/
│       └── domain=management/
│           └── management-account-policies.jsonl
│
├── role/
│   ├── domain=testing/
│   │   ├── level=basic/
│   │   │   └── basic-testing-roles-003.jsonl
│   │   ├── level=standard/
│   │   │   └── testing-roles-003.jsonl
│   │   ├── level=advanced/
│   │   │   └── advanced-testing-roles-003.jsonl
│   │   ├── level=oversight/
│   │   │   └── testing-oversight-roles-003.jsonl
│   │   └── level=owner/
│   │       └── testing-owner-roles-003.jsonl
│   ├── domain=development/
│   │   ├── level=basic/
│   │   ├── level=standard/
│   │   ├── level=advanced/
│   │   ├── level=oversight/
│   │   └── level=owner/
│   ├── domain=documentation/
│   │   ├── level=basic/
│   │   ├── level=standard/
│   │   ├── level=advanced/
│   │   └── level=owner/
│   ├── domain=security/
│   │   ├── level=basic/
│   │   ├── level=standard/
│   │   └── level=advanced/
│   └── domain=review/
│       ├── level=standard/
│       ├── level=advanced/
│       └── level=owner/
│
└── position/
    ├── track=engineering/
    │   └── engineering-positions-020.jsonl
    ├── track=quality/
    │   └── quality-positions-015.jsonl
    ├── track=documentation/
    │   └── documentation-positions-008.jsonl
    ├── track=architecture/
    │   └── architecture-positions-005.jsonl
    └── track=security/
        └── security-positions-010.jsonl
```

## Partitioning Schemes

### Policy: `scope=<type>/domain=<function>/`

**First partition: scope**
- `filesystem` - File system access (read/write/create/delete files)
- `api` - API endpoint access (call endpoints, manage APIs)
- `service` - Service/infrastructure access (deploy, restart, configure)
- `account` - Account/team management (manage users, billing, teams)

**Second partition: domain**
- `testing` - Testing-related policies
- `development` - Development-related policies
- `documentation` - Documentation-related policies
- `security` - Security-related policies
- `deployment` - Deployment-related policies
- `management` - Management-related policies

**Example paths:**
- `scope=filesystem/domain=testing/` - Policies for testing file access
- `scope=service/domain=deployment/` - Policies for deployment services
- `scope=account/domain=management/` - Policies for team management

### Role: `domain=<function>/level=<progression>/`

**First partition: domain**
- `testing` - Testing roles
- `development` - Development roles
- `documentation` - Documentation roles
- `security` - Security roles
- `review` - Code review roles

**Second partition: level**
- `basic` - Entry level, limited access
- `standard` - Independent work, standard access
- `advanced` - Senior level, elevated access
- `oversight` - Management level, team leadership
- `owner` - Full domain ownership

**Example paths:**
- `domain=testing/level=basic/` - BasicTesting role
- `domain=development/level=advanced/` - AdvancedDevelopment role
- `domain=documentation/level=owner/` - DocumentationOwner role

### Position: `track=<career>/`

**Single partition: track**
- `engineering` - Software engineering positions
- `quality` - Quality assurance positions
- `documentation` - Documentation positions
- `architecture` - Architecture positions
- `security` - Security positions

**Example paths:**
- `track=engineering/` - Developer, Senior Developer, Tech Lead
- `track=quality/` - QA Analyst, QA Engineer, Senior QA Engineer
- `track=documentation/` - Technical Writer, Documentation Lead

## How Standards Compose

### Access Evaluation Flow

When an entity attempts an action, the system:

1. **Load Position** - Get entity's assigned position
2. **Load Roles** - Get all roles from position
3. **Resolve Inheritance** - Walk up `extends` chain for each role
4. **Collect Policies** - Gather all policies from all roles
5. **Evaluate Statements** - Check if action+resource matches any statement
6. **Apply Precedence** - Child role policies override parent policies
7. **Determine Result**:
   - If any statement has `Deny` → **Denied**
   - If any statement has `Allow` → **Allowed** (with warnings if any)
   - Otherwise → **Denied** (default deny)

### Example: Senior QA Engineer Access Check

**Question:** Can entity with "Senior QA Engineer" position delete a test file?

**Step 1: Load Position**
```
Position: senior-qa-engineer
Roles: [advanced-testing, advanced-code-reviewing]
```

**Step 2: Resolve Role Inheritance**
```
advanced-testing
  extends: testing
    extends: basic-testing
      extends: null
```

**Step 3: Collect Policies**
```
From basic-testing:
  - basic-testing-filesystem-policy
From testing:
  - testing-filesystem-policy
  - testing-deployment-policy
From advanced-testing:
  - advanced-testing-filesystem-policy
  - advanced-testing-deployment-policy
```

**Step 4: Evaluate Statements**
```
Action: delete:test:unit
Resource: packages/core/src/__tests__/user.test.ts

Match from basic-testing-filesystem-policy:
  Effect: Deny
  Action: delete:*:*
  Resource: **/*
  → Would deny

Match from testing-filesystem-policy:
  Effect: Allow
  Action: delete:test:*
  Resource: **/*.test.ts
  → Overrides parent Deny (child wins)
```

**Result:** ✓ **Allowed** - Child role's Allow overrides parent's Deny

## Standard Domains and Progressions

### Testing Domain
1. **BasicTesting** - Read all, write tests, cannot delete, cannot deploy
2. **Testing** - + Delete own tests, deploy to staging
3. **AdvancedTesting** - + Deploy to production, access logs, approve PRs
4. **TestingOversight** - + Manage team, modify testing configs
5. **TestingOwner** - Full testing domain authority

### Development Domain
1. **BasicDevelopment** - Read all, write code in assigned areas, no deploy
2. **Development** - Full code access, create/modify any code, deploy to staging
3. **AdvancedDevelopment** - + Deploy to production, architecture decisions
4. **DevelopmentOversight** - + Manage team, approve designs, modify critical configs
5. **DevelopmentOwner** - Full development domain authority

### Documentation Domain
1. **BasicDocumentation** - Read all, write docs in assigned areas
2. **Documentation** - Full docs access, create/modify any docs
3. **AdvancedDocumentation** - + Approve doc changes, manage style guide
4. **DocumentationOwner** - Full documentation domain authority

### Security Domain
1. **BasicSecurity** - Read all, flag security issues, cannot modify
2. **Security** - + Write security docs, run audits, access logs
3. **AdvancedSecurity** - + Approve security-critical changes, access sensitive data
4. **SecurityOwner** - Full security domain authority

### Review Domain
1. **CodeReviewing** - Can comment on PRs, read all code
2. **AdvancedCodeReviewing** - + Can approve/reject PRs, block merges
3. **CodeReviewOwner** - + Override policies, force merge, manage review process

## Integration with Method System

Roles reference **Methods** from the MethodManifest to define quality standards:

```
Role: Testing
├─ policies: [testing-filesystem-policy, testing-deployment-policy]
├─ methods: ["Testing", "CodeReview"]
│
└─> MethodManifest provides standards:
    ├─> Testing Subject
    │   ├─ Write unit tests for each construct
    │   ├─ Test positive and negative cases
    │   └─ Test boundary conditions
    │
    └─> CodeReview Subject
        ├─ Review test coverage
        └─ Check for quality standards
```

**Methods answer:** "How should this work be done?"
**Policies answer:** "Can this entity do this work?"
**Roles combine:** "This is a testing role that can access test files and must follow testing standards"

## Benefits

**Separation of Concerns:**
- Policies = granular permissions
- Roles = functional capabilities
- Positions = job definitions
- Clear boundaries between each layer

**Reusability:**
- Define once, use many times
- Standards independent of entities
- Easy to update standards globally

**Inheritance:**
- Natural progression (BasicTesting → Testing → AdvancedTesting)
- Child overrides parent (explicit control)
- Clear authority chains

**Composability:**
- Positions combine multiple roles
- Roles combine multiple policies
- Flexible combinations for any job

**Auditability:**
- Every policy has human-readable explanation
- Clear chain: Entity → Position → Roles → Policies
- Track who can do what and why

**Scalability:**
- Add new domains without changing structure
- Add new tracks without conflicts
- Partition prevents large flat directories

**Integration:**
- Aligns with namespace/partition system
- Works with RowId for O(1) lookups
- Compatible with data layer infrastructure
