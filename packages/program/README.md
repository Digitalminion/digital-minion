# @digital-minion/program

Program management abstraction layer for Digital Minion.

## Overview

This package provides an organizational hierarchy and function-based work management system that sits between the CLI and backend implementations.

## Architecture

```
AdministrativeUnit → Business Unit → Organization → Team → Function Type
```

### Organizational Hierarchy

- **AdministrativeUnit**: Top-level organization (e.g., "Digital Minion")
- **Business Unit**: Major division (e.g., "Corp", "Management")
- **Organization**: Functional group that maps to Workspace (e.g., "Global Information Security")
- **Team**: Working group (1:1 with backend team)

### Function Types

#### 1. **Project** - Planned work with features and stages
- **Project** → Backend Project (1:1)
- **Feature** → Backend Milestone
- **Task** → Backend Task
- **Subtask** → Backend Subtask
- **Stages**: backlog, scoping, working, validating, documenting, delivered

#### 2. **Matter** - Incidents, requests, and discovered issues (Future)
- **Matter** → Backend Milestone (conceptual container)
- **Activity** → Backend Task
- **Discrete Task** → Backend Subtask
- **Types**: incident, request, vulnerability, compliance, investigation

#### 3. **Maintenance** - Recurring scheduled tasks (Future)
- **Process** → Backend Milestone
- **Task** → Backend Task (organized by due date sections)
- **Step** → Backend Subtask

## Usage

### Basic Setup

```typescript
import { ProgramManager, createProgramManager } from '@digital-minion/program';
import { BackendFactory } from '@digital-minion/lib';

// Create backend
const backend = await BackendFactory.create(config);

// Define context
const context: ProgramContext = {
  administrativeUnit: { id: 'dm', name: 'Digital Minion', ... },
  businessUnit: { id: 'corp', name: 'Corporate', ... },
  organization: { id: 'gis', name: 'Global Information Security', ... },
  team: { id: 'gtm', name: 'Global Threat Management', ... },
  functionType: 'project',
  backendType: 'asana',
  projectId: '1234567890',
};

// Create manager
const programManager = await createProgramManager({
  backend,
  context,
});
```

### Working with Projects

```typescript
// Get current project
const project = await programManager.project.getProject();

// Create a feature
const feature = await programManager.project.createFeature({
  name: 'User Authentication',
  description: 'Implement OAuth2 authentication',
  targetDate: '2025-12-31',
});

// Create a task
const task = await programManager.project.createTask({
  name: 'Design auth flow',
  featureId: feature.id,
  stage: 'scoping',
  dueDate: '2025-11-15',
});

// Create a subtask
const subtask = await programManager.project.createSubtask({
  taskId: task.id,
  name: 'Review OAuth2 providers',
});

// Move task through stages
await programManager.project.moveTaskToStage(task.id, 'working');

// Complete task
await programManager.project.completeTask(task.id);

// Get statistics
const stats = await programManager.project.getStatistics();
console.log(`Progress: ${stats.completedTasks}/${stats.totalTasks} tasks complete`);

// Get burndown for a feature
const burndown = await programManager.project.getFeatureBurndown(feature.id);
console.log(`Feature ${burndown.completionPercentage}% complete`);
```

## Backend Mapping

The package uses adapters to translate domain models to backend primitives:

### Metadata Tagging

All items are tagged with organizational context:
- `function:project` / `function:matter` / `function:maintenance`
- `administrative-unit:digital-minion`
- `bu:corp`
- `org:global-infosec`
- `team:global-threat-management`
- `level:feature` / `level:task` / `level:activity`

This allows:
- Round-trip sync preservation
- Semantic meaning in backend UI
- Filtering and organization

## Future Enhancements

- **Matter Manager**: Full implementation of incident/request management
- **Maintenance Manager**: Recurring task generation and scheduling
- **Custom Backend**: Native support for your own API
- **Advanced Reporting**: Cross-function analytics and dashboards
- **SLA Management**: Automated due date calculation and tracking

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run type-check

# Clean
npm run clean
```

## License

Apache-2.0
