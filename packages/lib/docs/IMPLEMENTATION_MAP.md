# Asana Backend Implementation Mapping

This document maps out all the classes and implementations needed to bring Asana functionality into the lib package.

## Overview

We need to create two main implementations:
1. **AsanaTaskBackend** - Implements `ITaskBackend` for all task operations
2. **AsanaConfigBackend** - Implements `IConfigBackend` for configuration/init operations

## Source Files to Migrate

### From CLI Package

1. **`cli/src/modules/list/asana-backend.ts`** (1224 lines)
   - Current class: `AsanaTaskBackend`
   - Implements: All `TaskBackend` interface methods
   - Dependencies: Asana SDK, filesystem (for file uploads)
   - **Target**: `lib/src/backends/asana/asana-task-backend.ts`

2. **`cli/src/modules/config/asana-client.ts`** (152 lines)
   - Current class: `AsanaClient`
   - Provides: Token validation, workspace/team/project discovery
   - Dependencies: Asana SDK
   - **Target**: `lib/src/backends/asana/asana-config-backend.ts`

## Implementation Plan

### 1. AsanaTaskBackend

**File**: `lib/src/backends/asana/asana-task-backend.ts`

**Responsibilities**:
- Implements all 48 methods from `ITaskBackend` interface
- Manages Asana SDK client instances (TasksApi, TagsApi, etc.)
- Handles API response transformation to our types
- Error handling and retry logic

**Key Methods** (all implemented in current asana-backend.ts):

#### Task Operations (7 methods)
- `listTasks()` - List all tasks in project
- `getTask(taskId)` - Get single task
- `createTask(name, notes?, dueOn?, priority?)` - Create task
- `updateTask(taskId, updates)` - Update task
- `deleteTask(taskId)` - Delete task
- `completeTask(taskId)` - Mark task complete

#### Tag Operations (4 methods)
- `listTags()` - List all tags
- `createTag(name)` - Create tag
- `addTagToTask(taskId, tagId)` - Add tag to task
- `removeTagFromTask(taskId, tagId)` - Remove tag from task

#### Section Operations (3 methods)
- `listSections()` - List all sections
- `createSection(name)` - Create section
- `moveTaskToSection(taskId, sectionId)` - Move task to section

#### Subtask Operations (2 methods)
- `listSubtasks(parentTaskId)` - List subtasks
- `createSubtask(parentTaskId, name, notes?, dueOn?)` - Create subtask

#### Comment Operations (2 methods)
- `listComments(taskId)` - List comments
- `createComment(taskId, text)` - Create comment

#### Attachment Operations (4 methods)
- `listAttachments(taskId)` - List attachments
- `attachUrl(taskId, url, name?)` - Attach URL
- `attachFile(taskId, filePath, name?)` - Upload file
- `deleteAttachment(attachmentId)` - Delete attachment

#### Dependency Operations (2 methods)
- `addDependency(taskId, dependsOnTaskId)` - Add dependency
- `removeDependency(taskId, dependsOnTaskId)` - Remove dependency

#### Assignment Operations (2 methods)
- `assignToUser(taskId, userGid)` - Assign to user
- `unassignTask(taskId)` - Unassign task

#### Custom Field Operations (3 methods)
- `listCustomFields()` - List custom fields
- `getCustomFieldValues(taskId)` - Get custom field values
- `setCustomFieldValue(taskId, fieldGid, value)` - Set custom field value

#### Status Update Operations (4 methods)
- `createStatusUpdate(projectGid, title, type, text?)` - Create status update
- `listStatusUpdates(projectGid)` - List status updates
- `getStatusUpdate(statusUpdateGid)` - Get status update
- `deleteStatusUpdate(statusUpdateGid)` - Delete status update

#### Project Operations (9 methods)
- `getProject(projectGid)` - Get project info
- `listProjects()` - List all projects
- `createProject(name, notes?, color?)` - Create project
- `getProjectBrief(projectGid)` - Get project brief
- `createProjectBrief(projectGid, title, text?)` - Create project brief
- `updateProjectBrief(briefGid, title?, text?)` - Update project brief
- `deleteProjectBrief(briefGid)` - Delete project brief
- `listProjectMembers(projectGid)` - List project members
- `addProjectMember(projectGid, userGid)` - Add project member
- `removeProjectMember(projectGid, userGid)` - Remove project member

#### User Operations (4 methods)
- `getCurrentUser()` - Get current user
- `getUser(userGid)` - Get user by GID
- `listUsers()` - List all users
- `findUserByEmail(email)` - Find user by email

#### Batch Operations (1 method)
- `executeBatch(operations)` - Execute batch operations

**Total**: 48 methods (all currently implemented)

**Dependencies**:
- `asana` npm package (Asana SDK)
- Node.js `fs` module (for file uploads)
- Node.js `form-data` package (for file uploads)

**Configuration Required**:
```typescript
interface AsanaConfig {
  accessToken: string;
  workspaceId: string;
  teamId: string;
  projectId: string;
}
```

### 2. AsanaConfigBackend

**File**: `lib/src/backends/asana/asana-config-backend.ts`

**Responsibilities**:
- Implements `IConfigBackend` interface
- Handles initialization and discovery
- Token validation
- Workspace/team/project enumeration

**Key Methods** (from IConfigBackend):

#### Required Methods (5)
- `validateToken(accessToken)` - Validate Asana PAT
- `getWorkspaces(accessToken)` - List workspaces
- `getTeams(accessToken, workspaceId)` - List teams in workspace
- `getProjects(accessToken, teamId)` - List projects in team
- `testConnection(config)` - Test backend connection

#### Optional Methods (2)
- `createTeam(accessToken, workspaceId, name, description?)` - Create team (optional)
- `createProject(accessToken, teamId, name, notes?)` - Create project (optional)

**Current Implementation** (AsanaClient):
- ✅ `validateToken()` - Implemented
- ✅ `getWorkspaces()` - Implemented
- ✅ `getTeams(workspaceId)` - Implemented
- ✅ `getProjects(teamId)` - Implemented
- ❌ `testConnection()` - Need to add
- ❌ `createTeam()` - Need to add (optional)
- ❌ `createProject()` - Need to add (optional)

**Dependencies**:
- `asana` npm package (Asana SDK)

### 3. Supporting Files

**File**: `lib/src/backends/asana/index.ts`
```typescript
export { AsanaTaskBackend } from './asana-task-backend';
export { AsanaConfigBackend } from './asana-config-backend';
```

**File**: `lib/src/backends/asana/asana-types.ts` (optional)
```typescript
// Asana-specific types that don't belong in core
export interface AsanaConfig {
  accessToken: string;
  workspaceId: string;
  teamId: string;
  projectId: string;
}
```

## Migration Steps

### Phase 1: Create Directory Structure
```bash
mkdir -p lib/src/backends/asana
```

### Phase 2: Copy and Adapt AsanaTaskBackend
1. Copy `cli/src/modules/list/asana-backend.ts` → `lib/src/backends/asana/asana-task-backend.ts`
2. Update imports to use `ITaskBackend` from `../core/task-backend`
3. Update type imports from `../core/types`
4. Ensure class implements `ITaskBackend` explicitly
5. Keep all existing method implementations (they're already correct)

### Phase 3: Create AsanaConfigBackend
1. Copy `cli/src/modules/config/asana-client.ts` → `lib/src/backends/asana/asana-config-backend.ts`
2. Rename class from `AsanaClient` to `AsanaConfigBackend`
3. Implement `IConfigBackend` interface
4. Adapt method signatures to match interface
5. Add missing methods (`testConnection`, optional `createTeam`/`createProject`)

### Phase 4: Update BackendFactory
1. Edit `lib/src/backends/factory.ts`
2. Import AsanaTaskBackend and AsanaConfigBackend
3. Update `createTaskBackend()` to instantiate AsanaTaskBackend for 'asana' type
4. Update `createConfigBackend()` to instantiate AsanaConfigBackend for 'asana' type

### Phase 5: Export from lib
1. Update `lib/src/backends/index.ts` to export Asana implementations
2. Update `lib/package.json` if needed for dependencies

### Phase 6: Testing
1. Build lib package: `npm run build`
2. Test imports and type checking
3. Consider adding unit tests

## Dependencies to Add to lib/package.json

```json
{
  "dependencies": {
    "asana": "^3.0.0",
    "form-data": "^4.0.0"
  }
}
```

## Benefits of This Architecture

1. **Reusability**: Backend logic can be used by CLI, agents, web apps, etc.
2. **Testability**: Backends can be mocked/stubbed for testing
3. **Extensibility**: Easy to add new backends (local, Jira, Linear, etc.)
4. **Type Safety**: Full TypeScript typing throughout
5. **Separation of Concerns**: Business logic separate from CLI presentation
6. **Single Source of Truth**: One implementation, many consumers

## Current Status

- ✅ Interface definitions complete (all 15 domain backends)
- ✅ Type definitions complete (all data types in `core/types.ts`)
- ✅ Factory pattern created
- ✅ **All 15 Asana backend implementations completed**
- ✅ **Factory fully wired up to Asana implementations**
- ✅ **Build successful**

## Completed Files

All implementation files have been created in `lib/src/backends/asana/`:

1. ✅ `asana-config.ts` - Base configuration and shared client
2. ✅ `asana-config-backend.ts` (119 lines)
3. ✅ `asana-task-backend.ts` (extracted from CLI)
4. ✅ `asana-tag-backend.ts` (extracted from CLI)
5. ✅ `asana-section-backend.ts` (extracted from CLI)
6. ✅ `asana-subtask-backend.ts` (extracted from CLI)
7. ✅ `asana-comment-backend.ts` (extracted from CLI)
8. ✅ `asana-attachment-backend.ts` (extracted from CLI)
9. ✅ `asana-dependency-backend.ts` (extracted from CLI)
10. ✅ `asana-workflow-backend.ts` (extracted from CLI)
11. ✅ `asana-status-backend.ts` (extracted from CLI)
12. ✅ `asana-project-backend.ts` (extracted from CLI)
13. ✅ `asana-user-backend.ts` (extracted from CLI)
14. ✅ `asana-batch-backend.ts` (extracted from CLI)
15. ✅ `asana-export-backend.ts` (8,714 bytes)
16. ✅ `asana-list-backend.ts` (9,786 bytes)
17. ✅ `index.ts` - Exports all Asana backends

## Ready for Use

The backend abstractions are now complete and ready for:
- CLI migration to use backends from lib
- Agent systems to consume backends
- Third-party integrations
- Unit and integration testing
