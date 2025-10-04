# Backend Usage Guide

This guide shows how to use the Digital Minion backend abstractions in your applications.

## Overview

The Digital Minion library provides 15 domain-specific backend interfaces with Asana implementations. Each backend handles a specific domain area (tasks, tags, sections, etc.), following the single responsibility principle.

## Installation

```bash
npm install @digital-minion/lib
```

## Quick Start

### Using Individual Backends

```typescript
import { BackendFactory } from '@digital-minion/lib';

// Create configuration
const config = {
  backend: 'asana' as const,
  config: {
    accessToken: 'your-asana-pat',
    workspaceId: 'workspace-gid',
    teamId: 'team-gid',
    projectId: 'project-gid'
  }
};

// Create individual backends
const taskBackend = BackendFactory.createTaskBackend(config);
const tagBackend = BackendFactory.createTagBackend(config);
const listBackend = BackendFactory.createListBackend(config);

// Use them
const tasks = await taskBackend.listTasks();
const tags = await tagBackend.listTags();
const filtered = await listBackend.listTasks({ completed: false, priority: 'high' });
```

### Using All Backends

```typescript
import { BackendFactory } from '@digital-minion/lib';

const config = {
  backend: 'asana' as const,
  config: { /* asana config */ }
};

// Get all backends at once
const backends = BackendFactory.createAllBackends(config);

// Access any backend
await backends.task.createTask('New task');
await backends.tag.createTag('important');
await backends.section.createSection('To Do');
await backends.comment.createComment(taskId, 'Great work!');
await backends.export.exportToCSV('tasks.csv');
```

## Domain Backends

### 1. ConfigBackend - Initialization

```typescript
import { AsanaConfigBackend } from '@digital-minion/lib/backends/asana';

const configBackend = new AsanaConfigBackend(accessToken);

// Validate token
const valid = await configBackend.validateToken(accessToken);

// Discover workspaces
const workspaces = await configBackend.getWorkspaces(accessToken);

// Get teams
const teams = await configBackend.getTeams(accessToken, workspaceId);

// Get projects
const projects = await configBackend.getProjects(accessToken, teamId);

// Test connection
const connected = await configBackend.testConnection({
  accessToken,
  workspaceId,
  teamId,
  projectId
});
```

### 2. TaskBackend - Core Task Operations

```typescript
const taskBackend = BackendFactory.createTaskBackend(config);

// List all tasks
const tasks = await taskBackend.listTasks();

// Get specific task
const task = await taskBackend.getTask(taskId);

// Create task
const newTask = await taskBackend.createTask(
  'Task name',
  'Optional notes',
  '2025-12-31', // due date
  'high' // priority
);

// Update task
const updated = await taskBackend.updateTask(taskId, {
  name: 'Updated name',
  completed: true
});

// Complete task
await taskBackend.completeTask(taskId);

// Delete task
await taskBackend.deleteTask(taskId);

// Assign to user
await taskBackend.assignToUser(taskId, userGid);

// Unassign
await taskBackend.unassignTask(taskId);
```

### 3. TagBackend - Tag Management

```typescript
const tagBackend = BackendFactory.createTagBackend(config);

// List all tags
const tags = await tagBackend.listTags();

// Create tag
const tag = await tagBackend.createTag('bug');

// Add tag to task
await tagBackend.addTagToTask(taskId, tagId);

// Remove tag from task
await tagBackend.removeTagFromTask(taskId, tagId);
```

### 4. ListBackend - Advanced Search & Filtering

```typescript
const listBackend = BackendFactory.createListBackend(config);

// List with filters
const incompleteTasks = await listBackend.listTasks({
  completed: false,
  priority: 'high',
  tags: ['bug', 'urgent'],
  dueAfter: '2025-01-01',
  dueBefore: '2025-12-31'
});

// Search tasks
const results = await listBackend.searchTasks('authentication', {
  completed: false
});

// Agent operations
await listBackend.assignAgent(taskId, 'alice');
await listBackend.unassignAgent(taskId);
await listBackend.reassignAgent(taskId, 'bob');
```

### 5. ExportBackend - Data Export

```typescript
const exportBackend = BackendFactory.createExportBackend(config);

// Export to CSV
await exportBackend.exportToCSV('tasks.csv', {
  completed: false,
  priority: 'high'
});

// Export to JSON
await exportBackend.exportToJSON('backup.json');

// Export to Markdown
await exportBackend.exportToMarkdown('report.md', {
  dueAfter: '2025-01-01'
});
```

### 6. SubtaskBackend - Subtask Management

```typescript
const subtaskBackend = BackendFactory.createSubtaskBackend(config);

// List subtasks
const subtasks = await subtaskBackend.listSubtasks(parentTaskId);

// Create subtask
const subtask = await subtaskBackend.createSubtask(
  parentTaskId,
  'Subtask name',
  'Optional notes',
  '2025-12-31' // due date
);
```

### 7. CommentBackend - Comments/Stories

```typescript
const commentBackend = BackendFactory.createCommentBackend(config);

// List comments
const comments = await commentBackend.listComments(taskId);

// Create comment
const comment = await commentBackend.createComment(
  taskId,
  'This is a comment'
);
```

### 8. AttachmentBackend - File & URL Attachments

```typescript
const attachmentBackend = BackendFactory.createAttachmentBackend(config);

// List attachments
const attachments = await attachmentBackend.listAttachments(taskId);

// Attach URL
await attachmentBackend.attachUrl(
  taskId,
  'https://example.com/doc',
  'Optional name'
);

// Attach file
await attachmentBackend.attachFile(
  taskId,
  '/path/to/file.pdf',
  'Optional name'
);

// Delete attachment
await attachmentBackend.deleteAttachment(attachmentId);
```

### 9. DependencyBackend - Task Dependencies

```typescript
const dependencyBackend = BackendFactory.createDependencyBackend(config);

// Add dependency (task A depends on task B)
await dependencyBackend.addDependency(taskAId, taskBId);

// Remove dependency
await dependencyBackend.removeDependency(taskAId, taskBId);

// Get dependencies (tasks this task depends on)
const dependencies = await dependencyBackend.getDependencies(taskId);

// Get dependents (tasks that depend on this task)
const dependents = await dependencyBackend.getDependents(taskId);
```

### 10. SectionBackend - Section Management

```typescript
const sectionBackend = BackendFactory.createSectionBackend(config);

// List sections
const sections = await sectionBackend.listSections();

// Create section
const section = await sectionBackend.createSection('In Progress');

// Move task to section
await sectionBackend.moveTaskToSection(taskId, sectionId);
```

### 11. WorkflowBackend - Custom Fields

```typescript
const workflowBackend = BackendFactory.createWorkflowBackend(config);

// List custom fields
const fields = await workflowBackend.listCustomFields();

// Get custom field values for task
const values = await workflowBackend.getCustomFieldValues(taskId);

// Set custom field value
await workflowBackend.setCustomFieldValue(
  taskId,
  customFieldGid,
  'value'
);
```

### 12. StatusBackend - Project Status Updates

```typescript
const statusBackend = BackendFactory.createStatusBackend(config);

// Create status update
const status = await statusBackend.createStatusUpdate(
  projectGid,
  'Weekly Update',
  'on_track', // or 'at_risk', 'off_track', 'on_hold'
  'Optional status text'
);

// List status updates
const updates = await statusBackend.listStatusUpdates(projectGid);

// Get specific status update
const update = await statusBackend.getStatusUpdate(statusUpdateGid);

// Delete status update
await statusBackend.deleteStatusUpdate(statusUpdateGid);
```

### 13. ProjectBackend - Project Operations

```typescript
const projectBackend = BackendFactory.createProjectBackend(config);

// Get project
const project = await projectBackend.getProject(projectGid);

// List all projects
const projects = await projectBackend.listProjects();

// Create project
const newProject = await projectBackend.createProject(
  'Project name',
  'Optional notes',
  'light-green' // color
);

// Project briefs
const brief = await projectBackend.getProjectBrief(projectGid);
await projectBackend.createProjectBrief(projectGid, 'Title', 'Text');
await projectBackend.updateProjectBrief(briefGid, 'New title', 'New text');
await projectBackend.deleteProjectBrief(briefGid);

// Project members
const members = await projectBackend.listProjectMembers(projectGid);
await projectBackend.addProjectMember(projectGid, userGid);
await projectBackend.removeProjectMember(projectGid, userGid);
```

### 14. UserBackend - User Operations

```typescript
const userBackend = BackendFactory.createUserBackend(config);

// Get current user
const me = await userBackend.getCurrentUser();

// Get user by GID
const user = await userBackend.getUser(userGid);

// List all users
const users = await userBackend.listUsers();

// Find user by email
const user = await userBackend.findUserByEmail('user@example.com');
```

### 15. BatchBackend - Batch Operations

```typescript
const batchBackend = BackendFactory.createBatchBackend(config);

// Execute multiple operations
const results = await batchBackend.executeBatch([
  {
    type: 'complete',
    taskIds: [taskId1, taskId2, taskId3]
  },
  {
    type: 'add-tag',
    taskIds: [taskId4],
    params: { tagName: 'urgent' }
  },
  {
    type: 'move-section',
    taskIds: [taskId5, taskId6],
    params: { sectionId: sectionGid }
  }
]);

// Supported operations:
// - 'assign' (params: { agentName })
// - 'unassign'
// - 'complete'
// - 'move-section' (params: { sectionId })
// - 'add-tag' (params: { tagName })
// - 'remove-tag' (params: { tagName })
// - 'update-task' (params: { updates })
```

## Type Definitions

All types are exported from the core package:

```typescript
import {
  Task,
  Tag,
  Section,
  Comment,
  Attachment,
  CustomField,
  CustomFieldValue,
  StatusUpdate,
  Project,
  ProjectBrief,
  ProjectMembership,
  User,
  BatchOperation,
  BatchResult,
  ExportFilters,
  ListFilters
} from '@digital-minion/lib';
```

## Error Handling

All backend methods may throw errors. Wrap calls in try-catch blocks:

```typescript
try {
  const tasks = await taskBackend.listTasks();
} catch (error) {
  console.error('Failed to list tasks:', error);
}
```

## Best Practices

1. **Reuse backend instances** - Create once, use multiple times
2. **Use specific backends** - Only import what you need
3. **Handle errors** - Wrap API calls in try-catch
4. **Type safety** - Use TypeScript interfaces for better IDE support
5. **Batch operations** - Use BatchBackend for bulk updates

## Next Steps

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [IMPLEMENTATION_MAP.md](./asana/IMPLEMENTATION_MAP.md) for implementation details
- Check the CLI source for real-world usage examples
