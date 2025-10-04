/**
 * Represents a task in the task management system.
 *
 * Contains all metadata for a task including identification, content,
 * status, assignment, organization, and relationships to other tasks.
 */
export interface Task {
  /** Global identifier for the task. */
  gid: string;

  /** Task name/title. */
  name: string;

  /** Detailed description or notes (optional). */
  notes?: string;

  /** Whether the task has been completed. */
  completed: boolean;

  /** Due date in YYYY-MM-DD format (optional). */
  dueOn?: string;

  /** Start date in YYYY-MM-DD format (optional). */
  startOn?: string;

  /** Name of the human assignee from Asana (optional). */
  assignee?: string;

  /** GID of the human assignee from Asana (optional). */
  assigneeGid?: string;

  /** Array of tag names applied to the task (optional). */
  tags?: string[];

  /** Parent task GID if this is a subtask (optional). */
  parent?: string;

  /** Number of subtasks belonging to this task (optional). */
  numSubtasks?: number;

  /** Section memberships across projects (optional). */
  memberships?: Array<{ section: { gid: string; name: string } }>;

  /** Task priority level (optional). */
  priority?: 'low' | 'medium' | 'high';

  /** Whether this task is a milestone (optional). */
  isMilestone?: boolean;

  /** Number of attachments on this task (optional). */
  numAttachments?: number;

  /** Task dependencies - tasks that block this task (optional). */
  dependencies?: string[];

  /** Task dependents - tasks that this task blocks (optional). */
  dependents?: string[];
}

/**
 * Represents a tag for categorizing and organizing tasks.
 */
export interface Tag {
  /** Global identifier for the tag. */
  gid: string;

  /** Tag name/label. */
  name: string;
}

/**
 * Represents a section within a project for grouping tasks.
 */
export interface Section {
  /** Global identifier for the section. */
  gid: string;

  /** Section name. */
  name: string;
}

/**
 * Represents a comment (story) on a task.
 */
export interface Comment {
  /** Global identifier for the comment. */
  gid: string;

  /** Comment text content. */
  text: string;

  /** Author of the comment. */
  createdBy?: string;

  /** When the comment was created (ISO 8601 format). */
  createdAt?: string;
}

/**
 * Represents an attachment on a task.
 */
export interface Attachment {
  /** Global identifier for the attachment. */
  gid: string;

  /** Attachment name. */
  name: string;

  /** Resource type (asana, dropbox, gdrive, box, vimeo, external, etc.). */
  resourceType?: string;

  /** Download URL (for file attachments). */
  downloadUrl?: string;

  /** Permanent URL to view the attachment. */
  permanentUrl?: string;

  /** Attachment host (asana, dropbox, gdrive, box, etc.). */
  host?: string;

  /** File size in bytes (for file attachments). */
  size?: number;

  /** When the attachment was created. */
  createdAt?: string;

  /** Parent task GID. */
  parent?: string;
}

/**
 * Represents a custom field definition.
 */
export interface CustomField {
  /** Global identifier for the custom field. */
  gid: string;

  /** Custom field name. */
  name: string;

  /** Field type (enum, multi_enum, text, number, date, people). */
  type: string;

  /** Description of the custom field. */
  description?: string;

  /** Enum options for enum/multi_enum fields. */
  enumOptions?: EnumOption[];

  /** Number precision for number fields. */
  precision?: number;

  /** Format for number fields (currency, percentage, duration, none). */
  format?: string;

  /** When the field was created. */
  createdAt?: string;
}

/**
 * Represents an enum option for custom fields.
 */
export interface EnumOption {
  /** Global identifier for the enum option. */
  gid: string;

  /** Option name/label. */
  name: string;

  /** Option color. */
  color?: string;

  /** Whether the option is enabled. */
  enabled?: boolean;
}

/**
 * Represents a custom field value on a task.
 */
export interface CustomFieldValue {
  /** Custom field GID. */
  gid: string;

  /** Custom field name. */
  name?: string;

  /** Enum value (for enum fields). */
  enumValue?: EnumOption;

  /** Multi-enum values (for multi-enum fields). */
  multiEnumValues?: EnumOption[];

  /** Number value (for number fields). */
  numberValue?: number;

  /** Text value (for text fields). */
  textValue?: string;

  /** Display value (formatted string representation). */
  displayValue?: string;
}

/**
 * Represents a status update on a project/goal/portfolio.
 */
export interface StatusUpdate {
  /** Global identifier for the status update. */
  gid: string;

  /** Status update title. */
  title: string;

  /** Plain text content. */
  text?: string;

  /** HTML formatted content. */
  htmlText?: string;

  /** Status type (on_track, at_risk, off_track, on_hold). */
  statusType: 'on_track' | 'at_risk' | 'off_track' | 'on_hold';

  /** Author of the status update. */
  author?: string;

  /** When the update was created. */
  createdAt?: string;

  /** Parent object GID (project/goal/portfolio). */
  parent?: string;
}

/**
 * Represents a project in Asana.
 */
export interface Project {
  /** Global identifier for the project. */
  gid: string;

  /** Project name. */
  name: string;

  /** Project notes/description. */
  notes?: string;

  /** Whether the project is archived. */
  archived?: boolean;

  /** Project color. */
  color?: string;

  /** Project owner. */
  owner?: string;

  /** Workspace GID. */
  workspace?: string;

  /** Team GID. */
  team?: string;

  /** Current status (on_track, at_risk, off_track, on_hold). */
  currentStatus?: string;

  /** Due date. */
  dueOn?: string;

  /** Start date. */
  startOn?: string;

  /** When the project was created. */
  createdAt?: string;

  /** When the project was last modified. */
  modifiedAt?: string;

  /** Permalink URL to the project. */
  permalinkUrl?: string;
}

/**
 * Represents a project brief (knowledge article).
 */
export interface ProjectBrief {
  /** Global identifier for the project brief. */
  gid: string;

  /** Brief title. */
  title?: string;

  /** Plain text content. */
  text?: string;

  /** HTML formatted content. */
  htmlText?: string;

  /** Permalink URL to the brief. */
  permalinkUrl?: string;

  /** Associated project GID. */
  project?: string;
}

/**
 * Represents a project membership.
 */
export interface ProjectMembership {
  /** Global identifier for the membership. */
  gid: string;

  /** User GID. */
  user?: string;

  /** User name. */
  userName?: string;

  /** Project GID. */
  project?: string;

  /** Access level or role. */
  accessLevel?: string;
}

/**
 * Represents a user in Asana.
 */
export interface User {
  /** Global identifier for the user. */
  gid: string;

  /** User's full name. */
  name: string;

  /** User's email address. */
  email?: string;

  /** User's profile photo URL. */
  photo?: string;

  /** Workspaces the user has access to. */
  workspaces?: Array<{ gid: string; name: string }>;
}

/**
 * Interface for task backend implementations.
 *
 * Defines all operations for managing tasks, tags, sections, and subtasks.
 * Implementations handle communication with different storage backends
 * (e.g., Asana API, local storage).
 */
export interface TaskBackend {
  /**
   * Lists all tasks in the configured project.
   *
   * Returns:
   *   Array of Task objects.
   */
  listTasks(): Promise<Task[]>;

  /**
   * Retrieves a specific task by ID.
   *
   * Args:
   *   taskId: The task GID to fetch.
   *
   * Returns:
   *   The requested Task object.
   */
  getTask(taskId: string): Promise<Task>;

  /**
   * Creates a new task.
   *
   * Args:
   *   name: Task name/title.
   *   notes: Optional task description.
   *   dueOn: Optional due date (YYYY-MM-DD).
   *   priority: Optional priority level (low, medium, high).
   *   isMilestone: Optional flag to mark as milestone.
   *
   * Returns:
   *   The created Task object.
   */
  createTask(name: string, notes?: string, dueOn?: string, priority?: string, isMilestone?: boolean): Promise<Task>;

  /**
   * Updates an existing task with partial changes.
   *
   * Args:
   *   taskId: The task GID to update.
   *   updates: Partial Task object with fields to update.
   *
   * Returns:
   *   The updated Task object.
   */
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;

  /**
   * Permanently deletes a task.
   *
   * Args:
   *   taskId: The task GID to delete.
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * Marks a task as complete.
   *
   * Args:
   *   taskId: The task GID to complete.
   *
   * Returns:
   *   The updated Task object with completed=true.
   */
  completeTask(taskId: string): Promise<Task>;

  /**
   * Lists all tags in the workspace.
   *
   * Returns:
   *   Array of Tag objects.
   */
  listTags(): Promise<Tag[]>;

  /**
   * Creates a new tag.
   *
   * Args:
   *   name: Tag name/label.
   *
   * Returns:
   *   The created Tag object.
   */
  createTag(name: string): Promise<Tag>;

  /**
   * Adds a tag to a task.
   *
   * Args:
   *   taskId: The task GID to tag.
   *   tagId: The tag GID to add.
   */
  addTagToTask(taskId: string, tagId: string): Promise<void>;

  /**
   * Removes a tag from a task.
   *
   * Args:
   *   taskId: The task GID.
   *   tagId: The tag GID to remove.
   */
  removeTagFromTask(taskId: string, tagId: string): Promise<void>;

  /**
   * Lists all sections in the project.
   *
   * Returns:
   *   Array of Section objects.
   */
  listSections(): Promise<Section[]>;

  /**
   * Creates a new section in the project.
   *
   * Args:
   *   name: Section name.
   *
   * Returns:
   *   The created Section object.
   */
  createSection(name: string): Promise<Section>;

  /**
   * Moves a task to a different section.
   *
   * Args:
   *   taskId: The task GID to move.
   *   sectionId: The target section GID.
   */
  moveTaskToSection(taskId: string, sectionId: string): Promise<void>;

  /**
   * Lists all subtasks belonging to a parent task.
   *
   * Args:
   *   parentTaskId: The parent task GID.
   *
   * Returns:
   *   Array of Task objects representing subtasks.
   */
  listSubtasks(parentTaskId: string): Promise<Task[]>;

  /**
   * Creates a new subtask under a parent task.
   *
   * Args:
   *   parentTaskId: The parent task GID.
   *   name: Subtask name/title.
   *   notes: Optional subtask description.
   *   dueOn: Optional due date (YYYY-MM-DD).
   *
   * Returns:
   *   The created Task object representing the subtask.
   */
  createSubtask(parentTaskId: string, name: string, notes?: string, dueOn?: string): Promise<Task>;

  /**
   * Lists all comments on a task.
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of Comment objects.
   */
  listComments(taskId: string): Promise<Comment[]>;

  /**
   * Creates a new comment on a task.
   *
   * Args:
   *   taskId: The task GID.
   *   text: Comment text content.
   *
   * Returns:
   *   The created Comment object.
   */
  createComment(taskId: string, text: string): Promise<Comment>;

  /**
   * Lists all attachments on a task.
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of Attachment objects.
   */
  listAttachments(taskId: string): Promise<Attachment[]>;

  /**
   * Attaches a URL/link to a task.
   *
   * Args:
   *   taskId: The task GID.
   *   url: The URL to attach.
   *   name: Optional name for the attachment.
   *
   * Returns:
   *   The created Attachment object.
   */
  attachUrl(taskId: string, url: string, name?: string): Promise<Attachment>;

  /**
   * Uploads a file attachment to a task.
   *
   * Args:
   *   taskId: The task GID.
   *   filePath: Local path to the file to upload.
   *   name: Optional name for the attachment.
   *
   * Returns:
   *   The created Attachment object.
   */
  attachFile(taskId: string, filePath: string, name?: string): Promise<Attachment>;

  /**
   * Deletes an attachment from a task.
   *
   * Args:
   *   attachmentId: The attachment GID to delete.
   */
  deleteAttachment(attachmentId: string): Promise<void>;

  /**
   * Adds a dependency relationship between tasks.
   *
   * Args:
   *   taskId: The task GID that depends on another.
   *   dependsOnTaskId: The task GID that this task depends on.
   */
  addDependency(taskId: string, dependsOnTaskId: string): Promise<void>;

  /**
   * Removes a dependency relationship between tasks.
   *
   * Args:
   *   taskId: The task GID.
   *   dependsOnTaskId: The task GID to remove the dependency from.
   */
  removeDependency(taskId: string, dependsOnTaskId: string): Promise<void>;

  /**
   * Assigns a task to a human user.
   *
   * Args:
   *   taskId: The task GID to assign.
   *   userGid: The user GID to assign to.
   */
  assignToUser(taskId: string, userGid: string): Promise<Task>;

  /**
   * Unassigns a task from its current assignee.
   *
   * Args:
   *   taskId: The task GID to unassign.
   */
  unassignTask(taskId: string): Promise<Task>;

  /**
   * Lists all custom fields available in the project.
   *
   * Returns:
   *   Array of CustomField objects.
   */
  listCustomFields(): Promise<CustomField[]>;

  /**
   * Gets custom field values for a specific task.
   *
   * Args:
   *   taskId: The task GID.
   *
   * Returns:
   *   Array of CustomFieldValue objects.
   */
  getCustomFieldValues(taskId: string): Promise<CustomFieldValue[]>;

  /**
   * Sets a custom field value on a task.
   *
   * Args:
   *   taskId: The task GID.
   *   customFieldGid: The custom field GID.
   *   value: The value to set (enum gid, number, text, etc.).
   *
   * Returns:
   *   Updated task.
   */
  setCustomFieldValue(taskId: string, customFieldGid: string, value: any): Promise<Task>;

  /**
   * Creates a status update for a project.
   *
   * Args:
   *   projectGid: The project GID.
   *   title: Status update title.
   *   statusType: Status type (on_track, at_risk, off_track, on_hold).
   *   text: Optional status update text.
   *
   * Returns:
   *   The created StatusUpdate object.
   */
  createStatusUpdate(projectGid: string, title: string, statusType: string, text?: string): Promise<StatusUpdate>;

  /**
   * Lists all status updates for a project.
   *
   * Args:
   *   projectGid: The project GID.
   *
   * Returns:
   *   Array of StatusUpdate objects.
   */
  listStatusUpdates(projectGid: string): Promise<StatusUpdate[]>;

  /**
   * Gets a specific status update.
   *
   * Args:
   *   statusUpdateGid: The status update GID.
   *
   * Returns:
   *   The StatusUpdate object.
   */
  getStatusUpdate(statusUpdateGid: string): Promise<StatusUpdate>;

  /**
   * Deletes a status update.
   *
   * Args:
   *   statusUpdateGid: The status update GID to delete.
   */
  deleteStatusUpdate(statusUpdateGid: string): Promise<void>;

  /**
   * Gets project information.
   *
   * Args:
   *   projectGid: The project GID.
   *
   * Returns:
   *   The Project object.
   */
  getProject(projectGid: string): Promise<Project>;

  /**
   * Lists all projects in the workspace.
   *
   * Returns:
   *   Array of Project objects.
   */
  listProjects(): Promise<Project[]>;

  /**
   * Creates a new project.
   *
   * Args:
   *   name: Project name.
   *   notes: Optional project description.
   *   color: Optional project color.
   *
   * Returns:
   *   The created Project object.
   */
  createProject(name: string, notes?: string, color?: string): Promise<Project>;

  /**
   * Gets a project brief.
   *
   * Args:
   *   projectGid: The project GID.
   *
   * Returns:
   *   The ProjectBrief object.
   */
  getProjectBrief(projectGid: string): Promise<ProjectBrief>;

  /**
   * Creates a project brief.
   *
   * Args:
   *   projectGid: The project GID.
   *   title: Brief title.
   *   text: Optional brief text content.
   *
   * Returns:
   *   The created ProjectBrief object.
   */
  createProjectBrief(projectGid: string, title: string, text?: string): Promise<ProjectBrief>;

  /**
   * Updates a project brief.
   *
   * Args:
   *   briefGid: The project brief GID.
   *   title: Optional new title.
   *   text: Optional new text content.
   *
   * Returns:
   *   The updated ProjectBrief object.
   */
  updateProjectBrief(briefGid: string, title?: string, text?: string): Promise<ProjectBrief>;

  /**
   * Deletes a project brief.
   *
   * Args:
   *   briefGid: The project brief GID to delete.
   */
  deleteProjectBrief(briefGid: string): Promise<void>;

  /**
   * Lists project members.
   *
   * Args:
   *   projectGid: The project GID.
   *
   * Returns:
   *   Array of ProjectMembership objects.
   */
  listProjectMembers(projectGid: string): Promise<ProjectMembership[]>;

  /**
   * Adds a user to a project.
   *
   * Args:
   *   projectGid: The project GID.
   *   userGid: The user GID to add.
   *
   * Returns:
   *   The created ProjectMembership object.
   */
  addProjectMember(projectGid: string, userGid: string): Promise<ProjectMembership>;

  /**
   * Removes a user from a project.
   *
   * Args:
   *   projectGid: The project GID.
   *   userGid: The user GID to remove.
   */
  removeProjectMember(projectGid: string, userGid: string): Promise<void>;

  /**
   * Gets the current authenticated user.
   *
   * Returns:
   *   The User object for the authenticated user.
   */
  getCurrentUser(): Promise<User>;

  /**
   * Gets a specific user by GID.
   *
   * Args:
   *   userGid: The user GID.
   *
   * Returns:
   *   The User object.
   */
  getUser(userGid: string): Promise<User>;

  /**
   * Lists all users in the workspace.
   *
   * Returns:
   *   Array of User objects.
   */
  listUsers(): Promise<User[]>;

  /**
   * Searches for a user by email address.
   *
   * Args:
   *   email: The email address to search for.
   *
   * Returns:
   *   The User object if found, undefined otherwise.
   */
  findUserByEmail(email: string): Promise<User | undefined>;

  /**
   * Executes a batch of operations in sequence.
   *
   * Args:
   *   operations: Array of batch operation objects.
   *
   * Returns:
   *   Array of batch operation results.
   */
  executeBatch(operations: BatchOperation[]): Promise<BatchResult[]>;
}

/**
 * Represents a single operation in a batch request.
 */
export interface BatchOperation {
  /** Unique ID for this operation (for tracking in results). */
  id?: string;

  /** Type of operation to perform. */
  type: 'assign' | 'unassign' | 'complete' | 'move-section' | 'add-tag' | 'remove-tag' | 'update-task';

  /** Task ID(s) to operate on. */
  taskIds: string[];

  /** Additional parameters specific to the operation type. */
  params?: {
    /** Agent name for assign operations. */
    agentName?: string;
    /** Section GID for move-section operations. */
    sectionId?: string;
    /** Tag name for add-tag/remove-tag operations. */
    tagName?: string;
    /** Task updates for update-task operations. */
    updates?: {
      name?: string;
      notes?: string;
      dueOn?: string;
      startOn?: string;
      priority?: 'low' | 'medium' | 'high';
    };
  };
}

/**
 * Represents the result of a batch operation.
 */
export interface BatchResult {
  /** The operation ID that was executed. */
  operationId?: string;

  /** Type of operation that was executed. */
  type: string;

  /** Whether the operation succeeded. */
  success: boolean;

  /** Number of tasks processed. */
  tasksProcessed: number;

  /** Number of tasks that succeeded. */
  tasksSucceeded: number;

  /** Number of tasks that failed. */
  tasksFailed: number;

  /** Error message if operation failed. */
  error?: string;

  /** Detailed results per task. */
  taskResults?: Array<{
    taskId: string;
    success: boolean;
    error?: string;
  }>;
}
