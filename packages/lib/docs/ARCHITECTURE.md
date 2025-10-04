# Domain-Driven Backend Architecture

## Overview

Instead of one monolithic TaskBackend, we split functionality into domain-specific backends that align with our CLI modules. This creates a clean separation of concerns and makes the system more maintainable.

## Domain Backends

Each backend handles a specific domain area:

### 1. **ConfigBackend** - Configuration & Initialization
- Token validation
- Workspace/team/project discovery
- Connection testing

**Methods**:
- `validateToken(accessToken)`
- `getWorkspaces(accessToken)`
- `getTeams(accessToken, workspaceId)`
- `getProjects(accessToken, teamId)`
- `testConnection(config)`

**Asana Source**: `cli/src/modules/config/asana-client.ts`

---

### 2. **TaskBackend** - Core Task Operations
- Task CRUD (create, read, update, delete)
- Task completion
- Task assignment

**Methods**:
- `listTasks()`
- `getTask(taskId)`
- `createTask(name, notes?, dueOn?, priority?)`
- `updateTask(taskId, updates)`
- `deleteTask(taskId)`
- `completeTask(taskId)`
- `assignToUser(taskId, userGid)`
- `unassignTask(taskId)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 3. **TagBackend** - Tag Management
- List, create, manage tags
- Add/remove tags from tasks

**Methods**:
- `listTags()`
- `createTag(name)`
- `addTagToTask(taskId, tagId)`
- `removeTagFromTask(taskId, tagId)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 4. **SectionBackend** - Section Management
- List, create sections
- Move tasks between sections

**Methods**:
- `listSections()`
- `createSection(name)`
- `moveTaskToSection(taskId, sectionId)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 5. **SubtaskBackend** - Subtask Management
- List subtasks
- Create subtasks under parent tasks

**Methods**:
- `listSubtasks(parentTaskId)`
- `createSubtask(parentTaskId, name, notes?, dueOn?)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 6. **CommentBackend** - Comments/Stories
- List comments on tasks
- Create comments

**Methods**:
- `listComments(taskId)`
- `createComment(taskId, text)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 7. **AttachmentBackend** - File & URL Attachments
- List attachments
- Attach URLs and files
- Delete attachments

**Methods**:
- `listAttachments(taskId)`
- `attachUrl(taskId, url, name?)`
- `attachFile(taskId, filePath, name?)`
- `deleteAttachment(attachmentId)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 8. **DependencyBackend** - Task Dependencies
- Add/remove dependency relationships
- Get task dependencies and dependents

**Methods**:
- `addDependency(taskId, dependsOnTaskId)`
- `removeDependency(taskId, dependsOnTaskId)`
- `getDependencies(taskId)` - Get tasks this task depends on
- `getDependents(taskId)` - Get tasks that depend on this task

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 9. **WorkflowBackend** - Custom Fields
- List custom fields
- Get/set custom field values on tasks

**Methods**:
- `listCustomFields()`
- `getCustomFieldValues(taskId)`
- `setCustomFieldValue(taskId, customFieldGid, value)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 10. **StatusBackend** - Status Updates
- Create, list, get, delete status updates
- Project status management

**Methods**:
- `createStatusUpdate(projectGid, title, statusType, text?)`
- `listStatusUpdates(projectGid)`
- `getStatusUpdate(statusUpdateGid)`
- `deleteStatusUpdate(statusUpdateGid)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 11. **ProjectBackend** - Project Management
- CRUD for projects
- Project briefs (knowledge articles)
- Project members

**Methods**:
- `getProject(projectGid)`
- `listProjects()`
- `createProject(name, notes?, color?)`
- `getProjectBrief(projectGid)`
- `createProjectBrief(projectGid, title, text?)`
- `updateProjectBrief(briefGid, title?, text?)`
- `deleteProjectBrief(briefGid)`
- `listProjectMembers(projectGid)`
- `addProjectMember(projectGid, userGid)`
- `removeProjectMember(projectGid, userGid)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 12. **UserBackend** - User Management
- Get current user
- List users
- Find users by email

**Methods**:
- `getCurrentUser()`
- `getUser(userGid)`
- `listUsers()`
- `findUserByEmail(email)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 13. **BatchBackend** - Batch Operations
- Execute multiple operations in a single call
- Bulk updates, assignments, etc.

**Methods**:
- `executeBatch(operations)`

**Asana Source**: Subset of `cli/src/modules/list/asana-backend.ts`

---

### 14. **ExportBackend** - Data Export
- Export tasks to CSV, JSON, Markdown
- Apply filters during export

**Methods**:
- `exportToCSV(filename, filters?)`
- `exportToJSON(filename, filters?)`
- `exportToMarkdown(filename, filters?)`

**Asana Source**: `cli/src/modules/export/index.ts` (uses TaskBackend)

---

### 15. **ListBackend** - Task Filtering & Search
- Advanced task querying
- Complex filtering logic
- Agent assignment management

**Methods**:
- `listTasks(filters?)`
- `searchTasks(query, filters?)`
- `assignAgent(taskId, agentName)`
- `unassignAgent(taskId)`
- `reassignAgent(taskId, newAgentName)`

**Asana Source**: `cli/src/modules/list/index.ts` (uses TaskBackend + TagBackend)

---

## Directory Structure

```
lib/src/backends/
├── core/
│   ├── types.ts                    # Shared data types
│   ├── config-backend.ts           # IConfigBackend
│   ├── task-backend.ts             # ITaskBackend
│   ├── tag-backend.ts              # ITagBackend
│   ├── section-backend.ts          # ISectionBackend
│   ├── subtask-backend.ts          # ISubtaskBackend
│   ├── comment-backend.ts          # ICommentBackend
│   ├── attachment-backend.ts       # IAttachmentBackend
│   ├── dependency-backend.ts       # IDependencyBackend
│   ├── workflow-backend.ts         # IWorkflowBackend
│   ├── status-backend.ts           # IStatusBackend
│   ├── project-backend.ts          # IProjectBackend
│   ├── user-backend.ts             # IUserBackend
│   ├── batch-backend.ts            # IBatchBackend
│   ├── export-backend.ts           # IExportBackend
│   ├── list-backend.ts             # IListBackend
│   └── index.ts                    # Export all interfaces
├── asana/
│   ├── asana-config-backend.ts
│   ├── asana-task-backend.ts
│   ├── asana-tag-backend.ts
│   ├── asana-section-backend.ts
│   ├── asana-subtask-backend.ts
│   ├── asana-comment-backend.ts
│   ├── asana-attachment-backend.ts
│   ├── asana-dependency-backend.ts
│   ├── asana-workflow-backend.ts
│   ├── asana-status-backend.ts
│   ├── asana-project-backend.ts
│   ├── asana-user-backend.ts
│   ├── asana-batch-backend.ts
│   ├── asana-export-backend.ts
│   ├── asana-list-backend.ts
│   └── index.ts                    # Export all Asana implementations
├── local/
│   └── (future implementations)
├── factory.ts                      # BackendFactory
└── index.ts                        # Main exports
```

## Benefits of Domain-Driven Architecture

1. **Modularity**: Each backend is focused on a single domain
2. **Maintainability**: Easy to find and update specific functionality
3. **Testability**: Can test each domain independently
4. **Extensibility**: Easy to add new domains or backends
5. **Composability**: CLI modules can use just the backends they need
6. **Clear Boundaries**: Each domain has well-defined responsibilities
7. **Scalability**: Can evolve domains independently

## Backend Factory Usage

The factory creates all backend instances:

```typescript
import { BackendFactory } from '@digital-minion/lib';

const config = { backend: 'asana', config: asanaConfig };

// Get specific domain backends
const taskBackend = BackendFactory.createTaskBackend(config);
const tagBackend = BackendFactory.createTagBackend(config);
const projectBackend = BackendFactory.createProjectBackend(config);
// ... etc

// Or get all backends at once
const backends = BackendFactory.createAllBackends(config);
// backends.task, backends.tag, backends.project, etc.
```

## CLI Module Mapping

Each CLI module uses specific backends:

| CLI Module | Backends Used |
|------------|---------------|
| config | ConfigBackend |
| task | TaskBackend |
| tag | TagBackend |
| section | SectionBackend |
| subtask | SubtaskBackend |
| comment | CommentBackend |
| attachment | AttachmentBackend |
| dependency | DependencyBackend |
| workflow | WorkflowBackend |
| status | StatusBackend |
| project | ProjectBackend |
| user | UserBackend |
| batch | BatchBackend |
| export | ExportBackend, TaskBackend |
| list | ListBackend, TaskBackend, TagBackend |

## Implementation Priority

**Phase 1** (Core functionality):
1. ConfigBackend
2. TaskBackend
3. TagBackend
4. ListBackend

**Phase 2** (Organization):
5. SectionBackend
6. SubtaskBackend
7. ProjectBackend

**Phase 3** (Collaboration):
8. CommentBackend
9. AttachmentBackend
10. UserBackend

**Phase 4** (Advanced):
11. DependencyBackend
12. WorkflowBackend
13. StatusBackend
14. BatchBackend
15. ExportBackend

## Current Status

- ✅ Architecture designed
- ✅ All 15 backend interface definitions created
- ✅ Factory updated with methods for all 15 domains
- ✅ AllBackends convenience type created
- ✅ **All 15 Asana backend implementations created**
- ✅ **Factory wired up with Asana implementations**
- ✅ **Build successful - all implementations compile correctly**
- ❌ CLI not migrated to use backends
- ❌ Unit tests not yet added

## Completed Implementations

All 15 Asana backends have been implemented and are ready for use:

1. ✅ **AsanaConfigBackend** - Token validation, workspace/team/project discovery
2. ✅ **AsanaTaskBackend** - Core task CRUD operations
3. ✅ **AsanaTagBackend** - Tag management
4. ✅ **AsanaSectionBackend** - Section management
5. ✅ **AsanaSubtaskBackend** - Subtask management
6. ✅ **AsanaCommentBackend** - Comment/story operations
7. ✅ **AsanaAttachmentBackend** - File and URL attachments
8. ✅ **AsanaDependencyBackend** - Task dependency relationships
9. ✅ **AsanaWorkflowBackend** - Custom field operations
10. ✅ **AsanaStatusBackend** - Project status updates
11. ✅ **AsanaProjectBackend** - Project CRUD and briefs
12. ✅ **AsanaUserBackend** - User operations
13. ✅ **AsanaBatchBackend** - Batch operations
14. ✅ **AsanaExportBackend** - Export to CSV/JSON/Markdown
15. ✅ **AsanaListBackend** - Advanced filtering and search

## Next Steps

1. Migrate CLI modules to use backend abstractions from lib
2. Add unit tests for backend implementations
3. Create local storage backend implementations
4. Add integration tests
