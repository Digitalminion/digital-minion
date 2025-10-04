# Backend Architecture

This directory contains the backend abstraction layer for the Digital Minion CLI.

## Overview

The backend system uses an abstract factory pattern to support multiple storage backends (Asana, local, etc.) without changing CLI code.

## Architecture

```
backends/
├── core/              # Abstract interfaces and types
│   ├── types.ts              # Shared types (Task, Tag, Section, etc.)
│   ├── task-backend.ts       # Task operations interface
│   └── config-backend.ts     # Configuration operations interface
├── asana/             # Asana implementation
│   ├── asana-task-backend.ts
│   └── asana-config-backend.ts
├── local/             # Local storage implementation (future)
│   ├── local-task-backend.ts
│   └── local-config-backend.ts
└── factory.ts         # Backend factory for instantiation
```

## Usage

```typescript
import { BackendFactory } from '@digital-minion/lib';
import { MinionConfig } from './config/types';

// Load config
const config: MinionConfig = loadConfig();

// Get backend instances
const taskBackend = BackendFactory.createTaskBackend(config);
const configBackend = BackendFactory.createConfigBackend(config);

// Use backends
const tasks = await taskBackend.listTasks();
const workspaces = await configBackend.listWorkspaces();
```

## Adding a New Backend

1. Implement `ITaskBackend` interface in `backends/<name>/<name>-task-backend.ts`
2. Implement `IConfigBackend` interface in `backends/<name>/<name>-config-backend.ts`
3. Add backend type to BackendType union
4. Update `BackendFactory` to instantiate your backend
5. Test your implementation

## Core Interfaces

### ITaskBackend

Handles all task-related operations:
- CRUD operations for tasks
- Tags, sections, subtasks
- Comments and attachments
- Dependencies
- Custom fields
- Batch operations
- User management
- Project management
- Status updates

### IConfigBackend

Handles configuration and initialization:
- Token validation
- Workspace/team/project discovery
- Authentication
- Connection testing

## Design Principles

1. **Separation of Concerns**: Backend logic is isolated from CLI presentation
2. **Interface-Driven**: All backends implement the same interfaces
3. **Factory Pattern**: Single point of instantiation
4. **Type Safety**: Full TypeScript typing throughout
5. **Extensibility**: Easy to add new backends
6. **Reusability**: Shared library that can be used by CLI, agents, or other tools
