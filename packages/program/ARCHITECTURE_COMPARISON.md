# Architecture Comparison: Standalone vs Program Mode

## Overview

This document explains the fundamental architectural differences between the **original standalone structure** (what exists in `@digital-minion/lib`) and the new **program mode structure** (in `@digital-minion/program`).

---

## Fundamental Differences

### 1. **Organizational Scope**

#### Standalone Mode (Original)
```
Backend → Project → Tasks/Sections/Tags
```
- **Single project focus**: Everything operates within one project context
- **Flat structure**: No organizational hierarchy
- **Direct mapping**: 1:1 with backend primitives (Asana Project = Our Project)
- **Simple config**: Just workspace, team, and project IDs

**Example Config:**
```typescript
{
  backend: 'asana',
  asana: {
    workspaceId: '123',
    teamId: '456',
    projectId: '789'
  }
}
```

#### Program Mode (New)
```
AdministrativeUnit → BusinessUnit → Organization → Team → Function Type → Work Items
```
- **Multi-entity support**: Can manage multiple organizations, teams, and projects
- **Hierarchical structure**: Full organizational tree with semantic meaning
- **Context-aware**: Every operation knows its full organizational context
- **Rich metadata**: Tags and structure preserve organizational hierarchy

**Example Context:**
```typescript
{
  administrativeUnit: { id: 'dm', name: 'Digital Minion' },
  businessUnit: { id: 'corp', name: 'Corporate' },
  organization: { id: 'gis', name: 'Global Information Security' },
  team: { id: 'gtm', name: 'Global Threat Management' },
  functionType: 'project'
}
```

---

### 2. **Work Classification**

#### Standalone Mode
- **Single work type**: Everything is a "task"
- **No semantic differentiation**: A security incident is treated the same as a planned feature
- **Generic operations**: task add, task complete, task list

**Task Model:**
```typescript
interface Task {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  dueOn?: string;
  assignee?: string;
  tags?: string[];
  section?: string;
  parent?: string;  // For subtasks
  isMilestone?: boolean;  // Optional flag
}
```

#### Program Mode
- **Three function types**: Matter, Project, Maintenance
- **Semantic models**: Each function type has purpose-specific fields and workflows
- **Type-specific operations**: matter create, project feature add, maintenance generate

**Matter Model (Incidents/Requests):**
```typescript
interface Matter {
  id: string;
  name: string;
  type: 'incident' | 'request' | 'vulnerability' | 'compliance' | 'investigation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'investigating' | 'escalated' | 'resolved';
  reportedAt: string;
  sla: { responseTime: string; resolutionTime: string };
  activities: Activity[];  // Investigation steps
  // ... matter-specific fields
}
```

**Project Model (Planned Work):**
```typescript
interface Project {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  features: Feature[];     // Major milestones
  stages: string[];        // backlog, scoping, working, etc.
  targetDate?: string;
  progress: { totalTasks, completedTasks };
  // ... project-specific fields
}
```

**Maintenance Model (Recurring Tasks):**
```typescript
interface MaintenanceProcess {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recurrencePattern: string;
  taskTemplate: {
    name: string;
    steps: StepTemplate[];  // Not "subtasks"
  };
  nextGeneration: string;
  // ... maintenance-specific fields
}
```

---

### 3. **Data Model Philosophy**

#### Standalone Mode: **Backend-First**
- **Backend dictates structure**: Our models mirror Asana's structure
- **Immediate persistence**: Operations hit backend directly
- **Backend constraints**: Limited by what Asana API supports
- **Simple abstraction**: Thin wrapper around backend API

```typescript
// Standalone: Direct backend mapping
Task = Asana Task
Subtask = Asana Subtask (parent field)
Section = Asana Section
Milestone = Asana Task (isMilestone: true)
```

**Code Structure:**
```typescript
// lib/src/backends/asana/asana-task-backend.ts
class AsanaTaskBackend implements TaskBackend {
  async createTask(name: string, notes?: string): Promise<Task> {
    // Direct Asana API call
    const response = await this.client.tasks.create({
      name,
      notes,
      projects: [this.projectId]
    });

    return this.mapAsanaTask(response);
  }
}
```

#### Program Mode: **Domain-First**
- **Domain drives structure**: Our models reflect business reality
- **Semantic richness**: Purpose-built types for different work categories
- **Backend agnostic**: Translate domain models to backend via adapters
- **Complex abstraction**: Semantic translation layer with metadata preservation

```typescript
// Program: Semantic mapping with adapter
Project = Backend Project (1:1)
Feature = Backend Milestone (semantic meaning added)
ProjectTask = Backend Task + metadata tags
Stage = Backend Section (with workflow meaning)

Matter = Backend Milestone (inverted meaning!)
Activity = Backend Task + matter metadata
DiscreteTask = Backend Subtask + metadata

MaintenanceProcess = Backend Milestone + recurrence
MaintenanceTask = Backend Task + time section
Step = Backend Subtask (semantic naming)
```

**Code Structure:**
```typescript
// program/src/adapters/project-adapter.ts
class ProjectAdapter extends BaseBackendAdapter {
  async createFeature(input: CreateFeatureInput): Promise<Feature> {
    // Create milestone in backend
    const milestone = await this.backend.milestone.create({
      name: input.name,
      description: input.description,
      targetDate: input.targetDate
    });

    // Add semantic metadata tags
    await this.addMetadataTags(milestone.id, [
      'level:feature',
      `function:project`,
      `org:${this.context.organization.name}`
    ]);

    // Return domain model
    return {
      id: this.generateId(),
      projectId: this.context.projectId,
      name: input.name,
      status: 'planned',
      tasks: [],
      _backendId: milestone.id,
      createdAt: this.now(),
      updatedAt: this.now()
    };
  }
}
```

---

### 4. **Storage Structure**

#### Standalone Mode
**Flat directory structure:**
```
.minion/local/
  team-name/
    project-name/
      tasks.jsonl          # All tasks
      tags.jsonl           # All tags
      sections.jsonl       # All sections
      comments.jsonl       # All comments
      attachments.jsonl    # All attachments
```

**Characteristics:**
- Simple and straightforward
- One project per directory
- All data at same level
- No hierarchical organization

#### Program Mode
**Hive-partitioned structure:**
```
.minion/local/
  administrative_unit=digital-minion/
    business_unit=corp/
      organization=global-information-security/
        team=global-threat-management/
          function=matters/
            matters.jsonl
            activities.jsonl
            discrete-tasks.jsonl
          function=projects/
            projects.jsonl
            features.jsonl
            tasks.jsonl
            subtasks.jsonl
          function=maintenance/
            processes.jsonl
            tasks.jsonl
            steps.jsonl
```

**Characteristics:**
- Self-documenting (key=value naming)
- Supports multiple teams/orgs
- Function-based partitioning
- Analyzable with data tools (Spark, Hive, etc.)
- Clear organizational boundaries

---

### 5. **Backend Compatibility**

#### Standalone Mode
✅ **Universal Compatibility**
- Works with ANY backend (Asana, Local, Planner, future Custom)
- No special requirements
- Direct mapping = maximum compatibility

**Why it works everywhere:**
```typescript
// Simple primitives that all backends understand
interface CorePrimitives {
  Task: { name, notes, completed, dueDate }
  Subtask: { parent, name, completed }
  Section: { name }
  Tag: { name }
}
```

#### Program Mode
⚠️ **Limited Compatibility**
- ✅ Local backend: Full support (complete control)
- ❌ Asana backend: No support (API limitations)
- ✅ Future Custom API: Will have full support
- ❌ Planner backend: No support (similar limitations)

**Why it doesn't work with Asana:**
```typescript
// Program mode needs features Asana doesn't support:

// 1. Complex metadata tagging
// Asana: Limited tags per workspace, no hierarchical tags
// Need: function:project, administrative-unit:dm, bu:corp, org:gis, team:gtm

// 2. Inverted semantics (Matter as Milestone)
// Asana: Milestone is a task flag, not a container
// Need: Milestone containing multiple Activities (Tasks)

// 3. Hive partitioning
// Asana: Single project structure
// Need: Multi-project, multi-function hierarchical storage

// 4. Custom organizational hierarchy
// Asana: Fixed Workspace → Team → Project
// Need: AdministrativeUnit → BU → Org → Team → Function → Project
```

---

### 6. **Use Cases**

#### Standalone Mode: **Task Management**

**Best for:**
- Individual projects
- Small teams
- Direct Asana integration
- Simple task tracking
- Lightweight operations

**Example Workflow:**
```bash
# Create tasks directly
dm task add "Implement authentication"
dm task add "Write tests" --due 2025-10-15

# Organize with sections
dm section create "In Progress"
dm task move <id> "In Progress"

# Tag and track
dm tag create "backend"
dm tag add <id> backend

# Complete work
dm task complete <id>
```

**User Story:**
> "I'm working on a software project in Asana. I want a CLI to quickly add tasks, move them through sections, and mark them complete without opening the web UI."

#### Program Mode: **Enterprise Work Management**

**Best for:**
- Large organizations
- Multiple teams and functions
- Different work types (incidents, projects, maintenance)
- Complex reporting and analytics
- Organizational hierarchy

**Example Workflow:**
```bash
# Set organizational context
dm context set
> Administrative Unit: Digital Minion
> Business Unit: Corporate
> Organization: Global Information Security
> Team: Global Threat Management

# Work with matters (security incidents)
dm function use matter
dm matter create --type incident \
  --severity critical \
  --name "Suspicious login activity from TOR nodes"

dm matter activity add <id> "Reviewed authentication logs"
dm matter activity add <id> "Contacted user for verification"
dm matter resolve <id>

# Switch to project work
dm function use project
dm project create "Password Spray Detection"

dm project feature add "Detection Logic" \
  --target-date 2025-11-01

dm project task add "Implement Splunk query" \
  --feature-id <feature-id> \
  --stage working

# Move through workflow stages
dm project task move <task-id> validating
dm project task move <task-id> delivered

# Get analytics
dm project stats  # Overall project progress
dm project burndown <feature-id>  # Feature completion

# Maintenance work
dm function use maintenance
dm maintenance process create "Weekly Vulnerability Scan" \
  --frequency weekly \
  --day-of-week monday

dm maintenance generate  # Create tasks for upcoming week
```

**User Story:**
> "I manage a security operations team with incident response, security projects, and recurring maintenance tasks. I need to track SLAs for incidents, measure project progress through stages, and automatically generate recurring tasks. I want all this organized by team and function type with detailed analytics."

---

### 7. **Type System**

#### Standalone Mode: **Simple & Direct**

```typescript
// Minimal types - just what backends need
export interface Task {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  dueOn?: string;
  assignee?: string;
  tags?: string[];
  section?: string;
  parent?: string;
  isMilestone?: boolean;
}

// One interface for everything
export interface TaskBackend {
  listTasks(): Promise<Task[]>;
  createTask(name: string, notes?: string): Promise<Task>;
  completeTask(taskId: string): Promise<Task>;
  // ... basic CRUD operations
}
```

**Characteristics:**
- Minimal type hierarchy
- Generic operations
- Backend-centric types
- Optional fields for flexibility

#### Program Mode: **Rich & Semantic**

```typescript
// Organizational hierarchy types
export interface AdministrativeUnit {
  id: string;
  name: string;
  description?: string;
  businessUnits: BusinessUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessUnit { /* ... */ }
export interface Organization { /* ... */ }
export interface Team { /* ... */ }

// Function-specific types
export type FunctionType = 'matter' | 'project' | 'maintenance';

// Base work item with context
export interface WorkItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  dueDate?: string;
  assignee?: string;
  tags?: string[];
  context: ProgramContext;  // Full organizational context
  _backendId?: string;      // Backend sync
  _backendType?: 'asana' | 'local' | 'custom';
  createdAt: string;
  updatedAt: string;
}

// Specialized types extending WorkItem
export interface Project extends WorkItem {
  status: ProjectStatus;
  features: Feature[];
  stages: string[];
  targetDate?: string;
  progress: { totalFeatures, completedFeatures, ... };
}

export interface Matter extends WorkItem {
  type: MatterType;
  severity: MatterSeverity;
  status: MatterStatus;
  reportedAt: string;
  sla: SLAConfig;
  activities: Activity[];
}

export interface MaintenanceProcess extends WorkItem {
  frequency: MaintenanceFrequency;
  recurrencePattern: string;
  taskTemplate: MaintenanceTaskTemplate;
  nextGeneration: string;
}

// Adapter interface per function type
export interface IProjectAdapter extends IBackendAdapter {
  createProject(input: CreateProjectInput): Promise<Project>;
  createFeature(input: CreateFeatureInput): Promise<Feature>;
  createTask(input: CreateProjectTaskInput): Promise<ProjectTask>;
  moveTaskToStage(taskId: string, stage: ProjectStage): Promise<void>;
  getStatistics(): Promise<ProjectStatistics>;
  getFeatureBurndown(featureId: string): Promise<BurndownData>;
}

// Manager interface with business logic
export interface IProjectManager {
  getProject(): Promise<Project>;
  createFeature(input: Omit<CreateFeatureInput, 'projectId'>): Promise<Feature>;
  moveTaskToStage(taskId: string, stage: ProjectStage): Promise<ProjectTask>;
  completeTask(taskId: string): Promise<void>;
  getStatistics(): Promise<ProjectStatistics>;
  getFeatureBurndown(featureId: string): Promise<BurndownData>;
}
```

**Characteristics:**
- Rich type hierarchy
- Context-aware operations
- Domain-centric types
- Type safety with generics
- Clear separation: Adapter (backend ops) vs Manager (business logic)

---

### 8. **Layer Architecture**

#### Standalone Mode: **2-Layer**

```
┌─────────────────────────┐
│   CLI Commands          │  User interface
│   (task add, etc.)      │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│   Backend Interface     │  Direct backend operations
│   (Asana/Local)         │  (CRUD, no business logic)
└─────────────────────────┘
```

**Characteristics:**
- Simple and direct
- Minimal abstraction
- CLI → Backend (2 hops)
- Backend handles all logic

#### Program Mode: **4-Layer**

```
┌─────────────────────────────────────┐
│   CLI Commands                      │  User interface
│   (project feature add, etc.)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Program Manager                   │  Business logic layer
│   (ProjectManager/MatterManager)    │  (validation, workflows,
│                                     │   analytics, orchestration)
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Backend Adapter                   │  Translation layer
│   (ProjectAdapter/MatterAdapter)    │  (semantic mapping,
│                                     │   metadata tagging)
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Backend Interface                 │  Storage operations
│   (Local/Custom API)                │  (CRUD only)
└─────────────────────────────────────┘
```

**Characteristics:**
- Clear separation of concerns
- Rich business logic
- CLI → Manager → Adapter → Backend (4 hops)
- Domain-driven design

**Example Operation Flow:**

**Standalone:** `dm task add "Fix bug"`
```typescript
1. CLI parses command
2. CLI calls backend.createTask("Fix bug")
3. Backend creates task in Asana/Local
4. Done
```

**Program:** `dm project task add "Fix bug" --stage working`
```typescript
1. CLI parses command
2. CLI calls projectManager.createTask({
     name: "Fix bug",
     stage: "working"
   })
3. ProjectManager validates:
   - Context is set
   - Stage exists
   - Function type is 'project'
4. Manager calls adapter.createTask(enrichedInput)
5. Adapter:
   - Creates backend task
   - Adds metadata tags (function:project, org:gis, level:task)
   - Links to feature (if specified)
   - Adds to stage section
6. Adapter returns domain model (ProjectTask)
7. Manager updates analytics/progress
8. CLI displays result
```

---

### 9. **Configuration Complexity**

#### Standalone Mode
**Simple config:**
```json
{
  "mode": "standalone",
  "defaultBackend": "asana-work",
  "backends": {
    "asana-work": {
      "type": "asana",
      "asana": {
        "workspaceId": "123",
        "teamId": "456",
        "projectId": "789"
      }
    },
    "local-work": {
      "type": "local",
      "local": {
        "basePath": ".minion/local",
        "teamName": "my-team",
        "projectName": "my-project"
      }
    }
  }
}
```

**Secrets file:**
```json
{
  "asana-work": {
    "asana": {
      "accessToken": "secret123"
    }
  }
}
```

#### Program Mode
**Complex config:**
```json
{
  "mode": "program",
  "defaultBackend": "local-dm",
  "backends": {
    "local-dm": {
      "type": "local",
      "supportsProgramMode": true,
      "local": {
        "basePath": ".minion/local"
      }
    }
  },
  "program": {
    "context": {
      "administrativeUnit": {
        "id": "dm",
        "name": "Digital Minion"
      },
      "businessUnit": {
        "id": "corp",
        "name": "Corporate"
      },
      "organization": {
        "id": "gis",
        "name": "Global Information Security",
        "workspaceId": "optional-for-future-hybrid"
      },
      "team": {
        "id": "gtm",
        "name": "Global Threat Management",
        "teamId": "optional-for-future-hybrid"
      }
    },
    "defaultFunctionType": "project",
    "storage": {
      "basePath": ".minion/local",
      "useHivePartitions": true
    }
  }
}
```

---

## Summary Table

| Aspect | Standalone Mode | Program Mode |
|--------|----------------|--------------|
| **Scope** | Single project | Multi-entity hierarchy |
| **Work Types** | Generic tasks | Matter/Project/Maintenance |
| **Model** | Backend-first (mirrors Asana) | Domain-first (business reality) |
| **Storage** | Flat directories | Hive-partitioned hierarchy |
| **Backends** | All (Asana, Local, etc.) | Local + Custom API only |
| **Use Case** | Task management | Enterprise work management |
| **Complexity** | Simple (2 layers) | Complex (4 layers) |
| **Config** | Minimal (project IDs) | Rich (org hierarchy) |
| **Analytics** | Basic (task counts) | Advanced (burndown, SLA, etc.) |
| **Learning Curve** | Low | High |
| **Flexibility** | Low (backend constraints) | High (domain-driven) |

---

## Migration Path

Users start with **standalone mode** for simplicity and broad compatibility. When they need:
- Multiple teams/organizations
- Different work types with specific workflows
- Advanced analytics and reporting
- Full control over data structure

They can migrate to **program mode** using:
```bash
dm migrate to-program
```

This wizard will:
1. Prompt for organizational hierarchy
2. Choose default function type
3. Transform existing tasks into appropriate function type
4. Restructure storage to Hive partitions
5. Update configuration

---

## Philosophical Difference

### Standalone: **"What does the backend support?"**
Design is constrained by backend capabilities. We adapt our needs to fit Asana's structure.

### Program: **"What does our business need?"**
Design is driven by business requirements. We adapt the backend to fit our structure using translation layers.

**Standalone** optimizes for **simplicity and compatibility**.
**Program** optimizes for **semantic richness and flexibility**.

Both are valid approaches for different use cases.
