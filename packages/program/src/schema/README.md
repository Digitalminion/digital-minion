# Digital Minion Program Schema

This directory contains the complete type schema for Digital Minion Program Mode, organized into logical namespaces.

## Directory Structure

```
schema/
├── minion/                    # Core Digital Minion schema namespace
│   ├── entity/               # Organizational hierarchy types
│   │   └── index.ts          # AdministrativeUnit, BusinessUnit, Organization, Team
│   ├── standard/             # Core/common types
│   │   └── index.ts          # WorkItem, ProgramContext, utilities
│   ├── function/             # Function-specific types
│   │   ├── matter.ts         # Matter (incidents, requests)
│   │   ├── project.ts        # Project (planned work)
│   │   ├── maintenance.ts    # Maintenance (recurring tasks)
│   │   └── index.ts          # Function namespace exports
│   ├── framework/            # Infrastructure types
│   │   └── index.ts          # Adapters, Managers, Backend integration
│   └── index.ts              # Minion namespace root
├── index.ts                  # Schema root exports
└── README.md                 # This file
```

## Namespaces

### Entity (`schema/minion/entity`)

Defines the organizational hierarchy for Digital Minion:

- **AdministrativeUnit**: Top-level organization (e.g., "Digital Minion")
- **BusinessUnit**: Major division (e.g., "Corporate", "Management")
- **Organization**: Functional group (e.g., "Global Information Security")
- **Team**: Working group (e.g., "Global Threat Management")

**Hierarchy**: AdministrativeUnit → BusinessUnit → Organization → Team

**Key Types**:
```typescript
import { AdministrativeUnit, BusinessUnit, Organization, Team } from '@digital-minion/program/schema/minion/entity';
```

### Standard (`schema/minion/standard`)

Defines core types used across all function types:

- **ProgramContext**: Full organizational context for operations
- **WorkItem**: Base interface for all work items
- **Priority, CommonStatus**: Enums for common values
- **TimeEstimate, TimeTracking**: Time management types
- **Attachment, Comment, Dependency, Link**: Common work item relationships
- **WorkItemStatistics, WorkItemFilter**: Query and aggregation types

**Key Types**:
```typescript
import {
  WorkItem,
  ProgramContext,
  Priority,
  TimeEstimate,
  WorkItemFilter
} from '@digital-minion/program/schema/minion/standard';
```

### Function (`schema/minion/function`)

Defines function-specific types for the three work categories:

#### Matter (`function/matter.ts`)
Reactive work: incidents, requests, vulnerabilities, investigations

**Key Types**:
- `Matter`: Main matter type
- `Activity`: Investigation/response activities
- `DiscreteTask`: Specific tasks within activities
- `MatterType, MatterSeverity, MatterStatus`: Enums
- `SLAConfig, SLAStatus`: Service level agreement tracking
- `MatterStatistics, MatterFilter`: Analytics and queries

**Backend Mapping**:
- Matter → Backend Milestone
- Activity → Backend Task
- DiscreteTask → Backend Subtask

#### Project (`function/project.ts`)
Planned work with features, stages, and tasks

**Key Types**:
- `Project`: Main project type
- `Feature`: Milestones within projects
- `ProjectTask`: Tasks within features/stages
- `ProjectSubtask`: Sub-tasks within tasks
- `ProjectStage, ProjectStatus, FeatureStatus`: Enums
- `ProjectStatistics, FeatureBurndownData`: Analytics
- `ProjectHealth, ProjectVelocity`: Advanced metrics

**Backend Mapping**:
- Project → Backend Project (1:1)
- Feature → Backend Milestone
- Stage → Backend Section
- ProjectTask → Backend Task
- ProjectSubtask → Backend Subtask

#### Maintenance (`function/maintenance.ts`)
Recurring scheduled tasks with automated generation

**Key Types**:
- `MaintenanceProcess`: Process definition and recurrence
- `MaintenanceTask`: Generated task instances
- `MaintenanceStep`: Steps within tasks (not "subtasks")
- `RecurrencePattern`: Complex scheduling rules
- `MaintenanceFrequency, MaintenanceTaskStatus`: Enums
- `TimeSection`: Time-based organization (overdue, due-today, etc.)
- `MaintenanceSchedule, MaintenanceComplianceReport`: Analytics

**Backend Mapping**:
- MaintenanceProcess → Backend Milestone
- MaintenanceTask → Backend Task (in time sections)
- MaintenanceStep → Backend Subtask

### Framework (`schema/minion/framework`)

Defines infrastructure types for adapters, managers, and backend integration:

**Adapters** (Backend translation layer):
- `IBackendAdapter`: Base adapter interface
- `IProjectAdapter`: Project-specific operations
- `IMatterAdapter`: Matter-specific operations
- `IMaintenanceAdapter`: Maintenance-specific operations
- `BackendFeature`: Feature detection
- `SyncResult, SyncError`: Synchronization types

**Managers** (Business logic layer):
- `IManager`: Base manager interface
- `IProjectManager`: High-level project operations
- `IMatterManager`: High-level matter operations
- `IMaintenanceManager`: High-level maintenance operations
- `IProgramManager`: Main entry point

**Supporting Types**:
- `BackendAdapterConfig`: Configuration
- `BackendMapping`: Field mapping metadata
- `ValidationResult`: Validation types
- `ProgramEvent`: Event system

## Usage Examples

### Import by Namespace

```typescript
import { entity, standard, function as fn, framework } from '@digital-minion/program/schema/minion';

// Use namespace
const unit: entity.AdministrativeUnit = { ... };
const context: standard.ProgramContext = { ... };
const project: fn.Project = { ... };
const adapter: framework.IProjectAdapter = { ... };
```

### Import Specific Types

```typescript
import {
  AdministrativeUnit,
  ProgramContext,
  Project,
  Matter,
  MaintenanceProcess,
  IProjectManager
} from '@digital-minion/program/schema/minion';

const unit: AdministrativeUnit = { ... };
const context: ProgramContext = { ... };
const project: Project = { ... };
```

### Import from Specific Namespace

```typescript
import { Project, Feature, ProjectTask } from '@digital-minion/program/schema/minion/function/project';
import { Matter, Activity } from '@digital-minion/program/schema/minion/function/matter';
import { IProjectAdapter } from '@digital-minion/program/schema/minion/framework';
```

## Type Hierarchy

### Work Items

```
WorkItem (base)
├── Matter
├── Project
└── MaintenanceProcess
```

### Organizational Hierarchy

```
AdministrativeUnit
└── BusinessUnit[]
    └── Organization[]
        └── Team[]
```

### Manager → Adapter → Backend

```
IManager (business logic)
└── IBackendAdapter (translation)
    └── Backend (storage)
```

## Schema Versioning

Current version: **1.0.0**

The schema version follows semantic versioning:
- **Major**: Breaking changes to existing types
- **Minor**: New types or optional fields added
- **Patch**: Documentation or non-breaking fixes

Import the schema version:
```typescript
import { SCHEMA_VERSION, SCHEMA_METADATA } from '@digital-minion/program/schema/minion';

console.log(SCHEMA_VERSION); // "1.0.0"
console.log(SCHEMA_METADATA);
```

## Design Principles

1. **Namespace Organization**: Types are organized by purpose (entity, standard, function, framework)
2. **Clear Separation**: Domain types (entity, function) separate from infrastructure (framework)
3. **Rich Metadata**: All types include comprehensive metadata for tracking
4. **Extensibility**: Custom properties fields allow extension without schema changes
5. **Type Safety**: Strong typing throughout with enums and unions
6. **Documentation**: Every type and field is documented
7. **Backend Agnostic**: Domain types don't depend on specific backend implementations

## Contributing

When adding new types to the schema:

1. **Determine the namespace**: entity, standard, function, or framework
2. **Follow existing patterns**: Include metadata, use consistent naming
3. **Document thoroughly**: Add JSDoc comments for all types and fields
4. **Consider extensibility**: Add `customProperties` or similar extension points
5. **Update exports**: Add to namespace index.ts
6. **Add examples**: Include usage examples in this README
7. **Version appropriately**: Increment schema version if breaking changes

## Related Documentation

- [Architecture Comparison](../../ARCHITECTURE_COMPARISON.md) - Differences between standalone and program mode
- [Migration Plan](../../../cli/MIGRATION.md) - CLI implementation roadmap
- [Program README](../../README.md) - Package overview and usage
