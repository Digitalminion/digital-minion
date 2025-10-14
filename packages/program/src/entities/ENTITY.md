# Entity System

## Purpose

The Entity system represents **individual contributors** - both humans and AI agents - in the organization. Entities are separate from standards, focusing on identity, capabilities, and activity rather than permissions or organizational rules.

## Core Concept

An entity is composed of three parts:

```
Entity
├── Identity (who they are)
├── Attributes (what they know)
└── Activity (what they've done)
```

**Key Insight:** Entities are **instances**, not definitions. They reference standards (Position) but don't define them. An entity represents one person or one AI agent, with their unique identity, skills, and history.

## The Relationship

```
Standards (defined once)
├── Policy
├── Role
└── Position
      ↑ referenced by
Entity (many instances)
├── Identity
├── Attributes
└── Activity
```

**How it works:**
- Standards define what can be done (Position → Roles → Policies)
- Entities are individuals who do the work
- Entity references a Position by ID
- Entity's attributes are matched against Position's requirements
- Entity's activity is tracked over time

## Entity Components

### 1. Identity - Who They Are

**Purpose:** Basic information about the entity - contact, type, status.

**Structure:**
```typescript
Identity {
  id: string                    // Unique identifier
  name: string                  // Display name
  type: 'ai-agent' | 'employee' | 'contractor' | 'volunteer'
  contact: {
    email: string
    location: string
    timezone: string
  }
  status: 'active' | 'inactive' | 'on-leave'
  positionId: string            // Reference to Position in standards
  onboarded_at: string          // ISO date
  last_active?: string          // ISO date (optional)
}
```

**Entity Types:**

**ai-agent** - AI-powered assistant
- Always available (24/7)
- No physical location (cloud-based)
- Attributes represent trained capabilities
- Activity tracks token usage, costs, API calls

**employee** - Full-time team member
- Working hours based on timezone
- Physical location matters
- Attributes represent learned skills
- Activity tracks work output and performance

**contractor** - Contract-based worker
- May have limited hours
- Could be remote or on-site
- Attributes represent contracted skills
- Activity tracks deliverables and hours

**volunteer** - Open-source contributor
- Sporadic availability
- Remote location
- Attributes represent contributed skills
- Activity tracks contributions

**Example Identity:**
```json
{
  "id": "alice-001",
  "name": "Alice Chen",
  "type": "employee",
  "contact": {
    "email": "alice@digitalminion.dev",
    "location": "Seattle, WA",
    "timezone": "America/Los_Angeles"
  },
  "status": "active",
  "positionId": "senior-qa-engineer",
  "onboarded_at": "2023-01-15T00:00:00Z",
  "last_active": "2025-10-11T17:45:00Z"
}
```

### 2. Attributes - What They Know

**Purpose:** Portable skills, certifications, and expertise that belong to the entity regardless of position.

**Structure:**
```typescript
Attribute {
  name: string                       // Skill or certification name
  type: 'skill' | 'certification' | 'framework' | 'domain-knowledge'
  proficiency?: number               // 1-5 scale (for skills)
  validated?: boolean                // For certifications
  acquired_at: string                // When gained
  expires_at?: string                // For time-limited certifications
  evidence?: string[]                // Links to proof
}
```

**Proficiency Levels (for skills):**
- **1: Beginner** - Learning fundamentals, requires guidance
- **2: Intermediate** - Can work with supervision
- **3: Advanced** - Can work independently
- **4: Expert** - Can mentor others, deep expertise
- **5: Master** - Defines best practices, recognized authority

**Attribute Types:**

**skill** - Technical or domain expertise
- Examples: TypeScript, System Design, Testing, Leadership
- Has proficiency level (1-5)
- Grows over time with experience

**certification** - Validated credentials
- Examples: AWS Certified, WCAG 2.1, Security+
- Has validated flag (true/false)
- May have expiration date
- Includes evidence links

**framework** - Specialized tool/framework knowledge
- Examples: Jest, React, Kubernetes, Django
- Has proficiency level (1-5)
- Tied to specific technologies

**domain-knowledge** - Business or industry expertise
- Examples: Healthcare, Finance, E-commerce, Legal
- Has proficiency level (1-5)
- Industry-specific understanding

**Example Attributes:**
```json
{
  "attributes": [
    {
      "name": "TypeScript",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2021-03-01T00:00:00Z"
    },
    {
      "name": "Jest",
      "type": "framework",
      "proficiency": 5,
      "acquired_at": "2021-06-01T00:00:00Z"
    },
    {
      "name": "WCAG 2.1 Certified",
      "type": "certification",
      "validated": true,
      "acquired_at": "2023-08-15T00:00:00Z",
      "expires_at": "2026-08-15T00:00:00Z",
      "evidence": ["https://cert.example.com/wcag-alice"]
    },
    {
      "name": "Accessibility",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2022-03-01T00:00:00Z"
    },
    {
      "name": "Healthcare",
      "type": "domain-knowledge",
      "proficiency": 3,
      "acquired_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Key Insight:** Attributes are **portable**. When an entity changes positions, they keep their attributes. Attributes grow over time as the entity learns and improves.

### 3. Activity - What They've Done

**Purpose:** Track actions, performance, and work history over time.

**Structure:** JSONL format (one action per line)
```typescript
Activity {
  timestamp: string              // ISO date-time
  action: string                 // What was done
  target: string                 // What was affected
  success: boolean               // Did it succeed
  details?: Record<string, any>  // Additional context
}
```

**Common Actions:**

**Code-related:**
- `code_written` - Wrote production code
- `code_reviewed` - Reviewed someone else's code
- `code_refactored` - Refactored existing code

**Test-related:**
- `test_created` - Wrote new tests
- `test_reviewed` - Reviewed test coverage
- `test_executed` - Ran test suite

**Documentation:**
- `docs_created` - Wrote new documentation
- `docs_updated` - Updated existing docs
- `docs_reviewed` - Reviewed documentation

**Deployment:**
- `deployed_staging` - Deployed to staging
- `deployed_production` - Deployed to production

**Team:**
- `mentoring_session` - Mentored another entity
- `code_review_feedback` - Provided review feedback
- `pair_programming` - Paired with another entity

**Example Activity:**
```jsonl
{"timestamp":"2025-10-11T10:00:00Z","action":"test_created","target":"EmailAddressModel","success":true,"details":{"testType":"unit","coverage":95,"duration":45}}
{"timestamp":"2025-10-11T14:30:00Z","action":"code_reviewed","target":"UserService","success":true,"details":{"linesReviewed":342,"issuesFound":3}}
{"timestamp":"2025-10-11T16:15:00Z","action":"accessibility_audit","target":"LoginComponent","success":true,"details":{"wcagLevel":"AA","issuesFound":2}}
```

## File Structure

```
.minion/entity/
├── entity.manifest.json         # Registry of all entities
│
└── roster/                      # Individual entity data
    ├── alice-001/
    │   ├── identity.json        # Who Alice is
    │   ├── attributes.json      # What Alice knows
    │   └── activity.jsonl       # What Alice has done
    │
    ├── claude-qa-1/
    │   ├── identity.json        # Who Claude-QA-1 is
    │   ├── attributes.json      # What Claude-QA-1 knows
    │   └── activity.jsonl       # What Claude-QA-1 has done
    │
    └── bob-002/
        ├── identity.json
        ├── attributes.json
        └── activity.jsonl
```

### Entity Manifest

**Purpose:** Central registry listing all entities and their basic info.

```json
{
  "type": "entity",
  "version": "1.0.0",
  "entities": [
    {
      "id": "alice-001",
      "name": "Alice Chen",
      "type": "employee",
      "positionId": "senior-qa-engineer",
      "status": "active"
    },
    {
      "id": "claude-qa-1",
      "name": "Claude QA",
      "type": "ai-agent",
      "positionId": "senior-qa-engineer",
      "status": "active"
    },
    {
      "id": "bob-002",
      "name": "Bob Martinez",
      "type": "employee",
      "positionId": "senior-developer",
      "status": "active"
    }
  ]
}
```

### Individual Entity Files

**roster/{entityId}/identity.json:**
```json
{
  "id": "alice-001",
  "name": "Alice Chen",
  "type": "employee",
  "contact": {
    "email": "alice@digitalminion.dev",
    "location": "Seattle, WA",
    "timezone": "America/Los_Angeles"
  },
  "status": "active",
  "positionId": "senior-qa-engineer",
  "onboarded_at": "2023-01-15T00:00:00Z",
  "last_active": "2025-10-11T17:45:00Z"
}
```

**roster/{entityId}/attributes.json:**
```json
{
  "attributes": [
    {
      "name": "TypeScript",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2021-03-01T00:00:00Z"
    },
    {
      "name": "Jest",
      "type": "framework",
      "proficiency": 5,
      "acquired_at": "2021-06-01T00:00:00Z"
    }
  ]
}
```

**roster/{entityId}/activity.jsonl:**
```jsonl
{"timestamp":"2025-10-11T10:00:00Z","action":"test_created","target":"EmailAddressModel","success":true}
{"timestamp":"2025-10-11T14:30:00Z","action":"code_reviewed","target":"UserService","success":true}
```

## Entity Lifecycle

### 1. Entity Registration

```
Step 1: Create Identity
├─ Assign unique ID
├─ Capture name, type, contact
├─ Set status to 'active'
└─ Record onboarded_at timestamp

Step 2: Document Attributes
├─ Assess current skills
├─ Assign proficiency levels
├─ Validate certifications
└─ Store in attributes.json

Step 3: Match to Position
├─ Compare entity attributes to position requirements
├─ Identify best-fit position
├─ Assign positionId
└─ Store in identity.json

Step 4: Initialize Activity
├─ Create empty activity.jsonl
└─ Begin tracking work
```

### 2. Position Assignment

**Matching Process:**
1. Load available positions
2. Compare entity attributes to position requiredAttributes
3. Check minimum proficiency levels
4. Verify required certifications
5. Rank positions by match quality
6. Assign best-fit position

**Example:**
```
Entity: Frank Martinez
Attributes:
  - TypeScript: 3 (advanced)
  - Testing: 3 (advanced)
  - Jest: 3 (advanced)

Evaluating positions:

  Senior QA Engineer requires:
    - Jest: 4 ✗ (has 3, need 4)
    - TypeScript: 3 ✓
    - Testing: 4 ✗ (has 3, need 4)
  → Not qualified (2 gaps)

  QA Engineer requires:
    - Jest: 3 ✓
    - TypeScript: 3 ✓
    - Testing: 3 ✓
  → Perfect match!

Assigned: qa-engineer
```

### 3. Attribute Growth

Attributes evolve as entities learn and grow:

```
Year 1: Frank joins as QA Engineer
  - TypeScript: 3, Testing: 3, Jest: 3

Year 2: Frank improves through work
  - TypeScript: 4, Testing: 4, Jest: 4
  → Now qualified for Senior QA Engineer!

Year 3: Frank promoted
  - Position changed to: senior-qa-engineer
  - Attributes continue to grow:
  - TypeScript: 5, Testing: 5, Jest: 5
  - New: Accessibility: 4

Year 4: Frank broadens expertise
  - New: Leadership: 3
  - New: Architecture: 3
  → Potential for Tech Lead position
```

### 4. Position Changes

When an entity's position changes:
1. Update `positionId` in identity.json
2. Entity keeps all attributes (portable)
3. New position may grant different:
   - Roles (functional capabilities)
   - Policies (permissions)
   - Methods (standards to follow)
4. Activity continues tracking in same file

## Human vs AI Entities

### Similarities
- Same data structure
- Same position assignments
- Same attribute tracking
- Same activity logging
- Reference same standards

### Differences

**Humans:**
```json
{
  "id": "alice-001",
  "type": "employee",
  "contact": {
    "location": "Seattle, WA",
    "timezone": "America/Los_Angeles"
  },
  "attributes": [
    {
      "name": "TypeScript",
      "proficiency": 5,
      "acquired_at": "2021-03-01",
      "notes": "4 years experience, primary language"
    }
  ]
}
```

**AI Agents:**
```json
{
  "id": "claude-qa-1",
  "type": "ai-agent",
  "contact": {
    "location": "Cloud",
    "timezone": "UTC"
  },
  "aiMetadata": {
    "model": "claude-sonnet-4-5",
    "provider": "Anthropic",
    "maxConcurrentTasks": 10
  },
  "attributes": [
    {
      "name": "TypeScript",
      "proficiency": 5,
      "acquired_at": "2025-08-01",
      "notes": "Trained on large TypeScript corpus"
    }
  ]
}
```

**Activity Tracking:**

Humans:
```jsonl
{"timestamp":"2025-10-11T10:00:00Z","action":"test_created","target":"UserService","success":true,"details":{"duration":120,"linesWritten":234}}
```

AI Agents:
```jsonl
{"timestamp":"2025-10-11T10:00:00Z","action":"test_created","target":"UserService","success":true,"details":{"duration":8,"tokensUsed":2340,"cost":0.12}}
```

## Example: Complete Entity

### Alice Chen - Human QA Engineer

**identity.json:**
```json
{
  "id": "alice-001",
  "name": "Alice Chen",
  "type": "employee",
  "contact": {
    "email": "alice@digitalminion.dev",
    "location": "Seattle, WA",
    "timezone": "America/Los_Angeles"
  },
  "status": "active",
  "positionId": "senior-qa-engineer",
  "onboarded_at": "2023-01-15T00:00:00Z",
  "last_active": "2025-10-11T17:45:00Z"
}
```

**attributes.json:**
```json
{
  "attributes": [
    {
      "name": "TypeScript",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2021-03-01T00:00:00Z"
    },
    {
      "name": "Jest",
      "type": "framework",
      "proficiency": 5,
      "acquired_at": "2021-06-01T00:00:00Z"
    },
    {
      "name": "Testing",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2021-09-01T00:00:00Z"
    },
    {
      "name": "Accessibility",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2022-03-01T00:00:00Z"
    },
    {
      "name": "WCAG 2.1 Certified",
      "type": "certification",
      "validated": true,
      "acquired_at": "2023-08-15T00:00:00Z",
      "expires_at": "2026-08-15T00:00:00Z",
      "evidence": ["https://cert.example.com/wcag-alice"]
    }
  ]
}
```

**activity.jsonl:**
```jsonl
{"timestamp":"2025-10-11T10:00:00Z","action":"test_created","target":"EmailAddressModel","success":true,"details":{"testType":"unit","coverage":95,"duration":45}}
{"timestamp":"2025-10-11T14:30:00Z","action":"code_reviewed","target":"UserService","success":true,"details":{"linesReviewed":342,"issuesFound":3}}
{"timestamp":"2025-10-11T16:15:00Z","action":"accessibility_audit","target":"LoginComponent","success":true,"details":{"wcagLevel":"AA","issuesFound":2}}
```

### Claude QA - AI Agent

**identity.json:**
```json
{
  "id": "claude-qa-1",
  "name": "Claude QA",
  "type": "ai-agent",
  "contact": {
    "email": "ai-qa@digitalminion.dev",
    "location": "Cloud",
    "timezone": "UTC"
  },
  "status": "active",
  "positionId": "senior-qa-engineer",
  "onboarded_at": "2025-08-01T00:00:00Z",
  "last_active": "2025-10-11T18:30:00Z",
  "aiMetadata": {
    "model": "claude-sonnet-4-5",
    "provider": "Anthropic",
    "maxConcurrentTasks": 10
  }
}
```

**attributes.json:**
```json
{
  "attributes": [
    {
      "name": "TypeScript",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2025-08-01T00:00:00Z"
    },
    {
      "name": "Jest",
      "type": "framework",
      "proficiency": 5,
      "acquired_at": "2025-08-01T00:00:00Z"
    },
    {
      "name": "Testing",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2025-08-01T00:00:00Z"
    },
    {
      "name": "Code Analysis",
      "type": "skill",
      "proficiency": 5,
      "acquired_at": "2025-08-01T00:00:00Z"
    }
  ]
}
```

**activity.jsonl:**
```jsonl
{"timestamp":"2025-10-11T18:00:00Z","action":"test_created","target":"DataLayerRepository","success":true,"details":{"testsGenerated":24,"tokensUsed":3420,"cost":0.08}}
{"timestamp":"2025-10-11T17:30:00Z","action":"test_created","target":"NamespaceManager","success":true,"details":{"testsGenerated":15,"tokensUsed":2890,"cost":0.07}}
{"timestamp":"2025-10-11T16:45:00Z","action":"code_analysis","target":"BaseRepository","success":true,"details":{"issuesFound":5,"tokensUsed":1560,"cost":0.04}}
```

## Benefits

**Portable Identity:**
- Entity data lives separately from standards
- Can change positions without losing history
- Attributes remain with entity

**Flexible Attribution:**
- Humans and AI use same model
- Easy to see who did what
- Clear capability tracking

**Growth Tracking:**
- Attributes evolve over time
- Career progression visible
- Skill gaps identifiable

**Activity History:**
- Complete work log
- Performance metrics
- Audit trail

**Standard Integration:**
- Entity references Position by ID
- Position defines capabilities via Roles
- Roles define permissions via Policies
- Clear separation of concerns
