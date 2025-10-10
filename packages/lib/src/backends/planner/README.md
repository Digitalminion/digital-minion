# Microsoft Planner Backend Implementation

This directory contains a well-architected implementation of the task management backend interfaces using Microsoft Graph API for Planner, OneDrive, and Microsoft 365 Groups.

## Architecture Overview

The implementation follows a layered architecture with strong encapsulation and testability:

```
┌─────────────────────────────────────────┐
│   Backend Implementations               │
│   (PlannerTaskBackend, etc.)            │
├─────────────────────────────────────────┤
│   Services Layer                        │
│   (OneDriveService, GroupsService)      │
├─────────────────────────────────────────┤
│   Graph Client Abstraction              │
│   (IGraphClient interface)              │
├─────────────────────────────────────────┤
│   Microsoft Graph SDK                   │
│   (@microsoft/microsoft-graph-client)   │
└─────────────────────────────────────────┘
```

### Key Design Principles

1. **Dependency Injection**: All backends accept an `IGraphClient` interface, allowing mock implementations for testing
2. **Service Encapsulation**: Complex operations (OneDrive, Groups) are isolated in service classes
3. **Separation of Concerns**: Each backend focuses on its specific domain
4. **Testability**: Mock clients and services can be injected for unit testing

## Core Components

### 1. Graph Client Abstraction (`graph-client.ts`)

Provides a thin wrapper around the Microsoft Graph SDK:

- **`IGraphClient`**: Interface for Graph API operations
- **`GraphClient`**: Production implementation using `@microsoft/microsoft-graph-client`
- **`MockGraphClient`**: Test implementation for mocking API calls

### 2. Configuration (`planner-config.ts`)

- **`PlannerConfig`**: Configuration interface requiring:
  - `accessToken`: Microsoft Graph API token
  - `tenantId`: Azure AD tenant ID
  - `planId`: Planner plan ID
  - `groupId`: Microsoft 365 Group ID (required for comments and file storage)
  - `graphClient` (optional): Custom Graph client for testing

- **`PlannerBackendBase`**: Base class providing:
  - Graph client initialization
  - Common configuration storage
  - ETag handling utilities

### 3. Services

#### OneDrive Service (`services/onedrive-service.ts`)
Encapsulates file storage operations:
- Upload files to group drive
- Create sharing links
- Manage folders
- Delete files

#### Groups Service (`services/groups-service.ts`)
Encapsulates group conversation operations:
- Create conversation threads
- List and reply to posts
- HTML/text conversion utilities

### 4. Backend Implementations

#### PlannerTaskBackend
- Full CRUD operations for tasks
- Handles both basic task properties and task details (requires 2 API calls)
- Priority mapping (low/medium/high → 0-10 scale)
- Assignment management
- ETag handling for safe updates

#### PlannerAttachmentBackend
- Lists task references as attachments
- Adds URL references to tasks
- **Bonus**: `uploadFile()` method integrates OneDrive for file uploads
- Creates shareable links and stores them as task references

#### PlannerCommentBackend
- Uses Microsoft 365 Group conversations
- Creates conversation threads for tasks
- Manages `conversationThreadId` on tasks
- HTML/text conversion for comment content

## Usage Examples

### Basic Setup

```typescript
import { PlannerConfig, PlannerTaskBackend, PlannerCommentBackend, PlannerAttachmentBackend } from './backends/planner';

const config: PlannerConfig = {
  accessToken: 'YOUR_GRAPH_API_TOKEN',
  tenantId: 'your-tenant-id',
  planId: 'your-plan-id',
  groupId: 'your-group-id',
};

const taskBackend = new PlannerTaskBackend(config);
const commentBackend = new PlannerCommentBackend(config);
const attachmentBackend = new PlannerAttachmentBackend(config);
```

### Creating and Managing Tasks

```typescript
// Create a task
const task = await taskBackend.createTask(
  'Implement new feature',
  'Add user authentication system',
  '2025-12-31',
  'high'
);

// Update a task
await taskBackend.updateTask(task.gid, {
  completed: true,
  priority: 'medium',
});

// Assign to a user
await taskBackend.assignToUser(task.gid, 'user-id');

// Delete a task
await taskBackend.deleteTask(task.gid);
```

### Working with Comments

```typescript
// Add a comment to a task
const comment = await commentBackend.createComment(
  taskId,
  'This is looking good! Ship it!'
);

// List all comments
const comments = await commentBackend.listComments(taskId);
comments.forEach(c => console.log(`${c.createdBy}: ${c.text}`));
```

### File Attachments with OneDrive Integration

```typescript
// Add a URL reference
await attachmentBackend.addAttachment(
  taskId,
  'https://example.com/doc',
  'Important Document'
);

// Upload a file (bonus feature!)
const attachment = await attachmentBackend.uploadFile(
  taskId,
  '/path/to/file.pdf',
  'Requirements.pdf'
);

console.log(`File uploaded: ${attachment.downloadUrl}`);

// List all attachments
const attachments = await attachmentBackend.listAttachments(taskId);
```

## Testing

The architecture is designed for easy testing with dependency injection.

### Unit Testing Example

```typescript
import { MockGraphClient, PlannerTaskBackend, PlannerConfig } from './backends/planner';

describe('PlannerTaskBackend', () => {
  let mockClient: MockGraphClient;
  let taskBackend: PlannerTaskBackend;

  beforeEach(() => {
    mockClient = new MockGraphClient();

    const config: PlannerConfig = {
      accessToken: 'test-token',
      tenantId: 'test-tenant',
      planId: 'test-plan',
      groupId: 'test-group',
      graphClient: mockClient, // Inject mock
    };

    taskBackend = new PlannerTaskBackend(config);
  });

  it('should list tasks', async () => {
    // Setup mock response
    mockClient.setMockResponse('/planner/plans/test-plan/tasks', {
      value: [
        {
          id: 'task-1',
          title: 'Test Task',
          percentComplete: 0,
          priority: 5,
        },
      ],
    });

    // Execute
    const tasks = await taskBackend.listTasks();

    // Assert
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe('Test Task');
    expect(tasks[0].completed).toBe(false);

    // Verify API call was made
    const requests = mockClient.getRequests('GET', /\/planner\/plans/);
    expect(requests).toHaveLength(1);
  });

  it('should create a task', async () => {
    mockClient.setMockResponse('/planner/tasks', {
      id: 'new-task-id',
      title: 'New Task',
      percentComplete: 0,
      priority: 9,
      '@odata.etag': 'etag-123',
    });

    mockClient.setMockResponse('/planner/tasks/new-task-id/details', {
      id: 'new-task-id',
      description: 'Task description',
      '@odata.etag': 'etag-456',
    });

    const task = await taskBackend.createTask(
      'New Task',
      'Task description',
      '2025-12-31',
      'high'
    );

    expect(task.name).toBe('New Task');
    expect(task.priority).toBe('high');
  });
});
```

### Integration Testing

For integration tests, use real credentials but against a test environment:

```typescript
describe('Planner Integration Tests', () => {
  const config: PlannerConfig = {
    accessToken: process.env.TEST_GRAPH_TOKEN!,
    tenantId: process.env.TEST_TENANT_ID!,
    planId: process.env.TEST_PLAN_ID!,
    groupId: process.env.TEST_GROUP_ID!,
  };

  it('should create and delete a task', async () => {
    const taskBackend = new PlannerTaskBackend(config);

    const task = await taskBackend.createTask('Integration Test Task');
    expect(task.gid).toBeDefined();

    await taskBackend.deleteTask(task.gid);
  });
});
```

## Microsoft Graph API Mapping

### What Maps Well ✅

- **Tasks**: Full CRUD, completion, dates, priority
- **Sections**: Planner buckets map to sections
- **Categories**: Plan-specific categories (limited to 25)
- **Assignments**: User assignment (Planner supports multiple, we use first)
- **Comments**: Via Group conversations API
- **File Attachments**: Via OneDrive integration

### Known Limitations ⚠️

1. **Task Details Split**: Description/notes require separate API call to `/details` endpoint
2. **ETag Required**: All updates require `If-Match` header with current etag
3. **25 Category Limit**: Plans limited to 25 categories (category1-category25)
4. **Multi-Assignee**: Planner supports multiple assignees, our interface assumes single
5. **No Native Dependencies**: Task dependencies not supported in Planner (would need custom solution)
6. **Subtasks**: Checklist items are not full tasks (no dates, assignees, etc.)

### Gap Solutions

| Gap | Solution |
|-----|----------|
| File uploads | OneDrive integration (implemented) |
| Comments | Groups API integration (implemented) |
| Task details split | Parallel API calls in `getTask()` |
| ETags | Helper method `withEtag()` in base class |
| Dependencies | Not implemented (would require external storage) |
| Subtasks | Use checklist items (limited functionality) |

## Required Permissions

Your Azure AD app needs these Microsoft Graph API permissions:

- `Tasks.ReadWrite` - For Planner tasks
- `Group.ReadWrite.All` - For group conversations (comments)
- `Files.ReadWrite.All` - For OneDrive file operations
- `User.Read.All` - For user information

## Installation

```bash
npm install @microsoft/microsoft-graph-client
```

## Future Enhancements

Possible improvements to consider:

1. **Caching Layer**: Cache etags and task details to reduce API calls
2. **Batch Operations**: Use Graph batch API for multiple operations
3. **Webhook Support**: Listen for task changes via Microsoft Graph webhooks
4. **SharePoint Lists**: Store custom metadata and dependencies
5. **Retry Logic**: Implement exponential backoff for 429 (rate limit) errors
6. **OneNote Integration**: Rich task notes with OneNote pages

## Architecture Benefits

1. **Testability**: Easy to mock and test without hitting real APIs
2. **Maintainability**: Clear separation of concerns
3. **Extensibility**: Easy to add new services or backends
4. **Type Safety**: Full TypeScript support with interfaces
5. **Reusability**: Services can be used independently
6. **Debuggability**: Mock client tracks all API calls for inspection
