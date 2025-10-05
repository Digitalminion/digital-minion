/**
 * Backend abstraction layer for Digital Minion.
 *
 * Provides domain-driven interfaces and factory for working with different
 * task management backends (Asana, local storage, etc.) without coupling
 * to specific implementations.
 *
 * Main exports:
 * - 15 domain backend interfaces (ITaskBackend, ITagBackend, etc.)
 * - BackendFactory: Factory for creating backend instances
 * - All data types: Task, Tag, Section, etc. (from core/types)
 */

// Export all domain backend interfaces
export { IConfigBackend, Workspace, Team, ProjectSummary, BackendConfig } from './core/config-backend';
export { ITaskBackend } from './core/task-backend';
export { ITagBackend } from './core/tag-backend';
export { ISectionBackend } from './core/section-backend';
export { ISubtaskBackend } from './core/subtask-backend';
export { ICommentBackend } from './core/comment-backend';
export { IAttachmentBackend } from './core/attachment-backend';
export { IDependencyBackend } from './core/dependency-backend';
export { IWorkflowBackend } from './core/workflow-backend';
export { IStatusBackend } from './core/status-backend';
export { IProjectBackend } from './core/project-backend';
export { IUserBackend } from './core/user-backend';
export { IBatchBackend } from './core/batch-backend';
export { IExportBackend, ExportFilters } from './core/export-backend';
export { IListBackend, ListFilters } from './core/list-backend';
export { ITemplateBackend, TaskTemplate } from './core/template-backend';
export { ITimeTrackingBackend, TimeEntry, TaskTimeStats } from './core/time-tracking-backend';

// Export all types from core/types
export {
  Task,
  Tag,
  Section,
  Comment,
  Attachment,
  CustomField,
  EnumOption,
  CustomFieldValue,
  StatusUpdate,
  Project,
  ProjectBrief,
  ProjectMembership,
  User,
  TaskBackend,
  BatchOperation,
  BatchResult
} from './core/types';

// Note: TaskTemplate is exported from template-backend above

// Export factory and configuration types
export { BackendFactory, BackendType, MinionConfig, AllBackends } from './factory';
