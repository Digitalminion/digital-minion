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

  /** Name of the human assignee from Asana (optional). */
  assignee?: string;

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
   *
   * Returns:
   *   The created Task object.
   */
  createTask(name: string, notes?: string, dueOn?: string, priority?: string): Promise<Task>;

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
}
