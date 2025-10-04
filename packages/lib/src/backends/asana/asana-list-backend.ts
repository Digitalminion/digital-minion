const Asana = require('asana');
import { IListBackend, ListFilters } from '../core/list-backend';
import { Task, Tag } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the IListBackend interface.
 *
 * Provides advanced task querying, filtering, and agent assignment management
 * using the Asana API as the backend storage system. Handles task listing,
 * searching, and agent tag-based assignments.
 *
 * This class focuses exclusively on list/search operations and agent management
 * as defined by the IListBackend interface.
 */
export class AsanaListBackend extends AsanaBackendBase implements IListBackend {
  private tasksApi: any;
  private tagsApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tasksApi = new Asana.TasksApi();
    this.tagsApi = new Asana.TagsApi();
  }

  async listTasks(filters?: ListFilters): Promise<Task[]> {
    try {
      const result = await this.tasksApi.getTasksForProject(this.projectId, {
        opt_fields: 'gid,name,notes,completed,due_on,start_on,assignee.name,assignee.gid,tags.name,parent.gid,num_subtasks,memberships.section.name,memberships.section.gid',
      });

      const tasks = result.data.map((task: any) => {
        const tags = task.tags?.map((tag: any) => tag.name) || [];
        // Derive priority from priority:* tags
        const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
        const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

        return {
          gid: task.gid,
          name: task.name,
          notes: task.notes || undefined,
          completed: task.completed,
          dueOn: task.due_on || undefined,
          startOn: task.start_on || undefined,
          assignee: task.assignee?.name || undefined,
          assigneeGid: task.assignee?.gid || undefined,
          tags,
          parent: task.parent?.gid || undefined,
          numSubtasks: task.num_subtasks || undefined,
          memberships: task.memberships || undefined,
          priority,
        };
      });

      return this.applyFilters(tasks, filters);
    } catch (error) {
      throw new Error(`Failed to list tasks: ${error}`);
    }
  }

  async searchTasks(query: string, filters?: ListFilters): Promise<Task[]> {
    try {
      const allTasks = await this.listTasks(filters);
      const searchQuery = query.toLowerCase();

      return allTasks.filter(task =>
        task.name.toLowerCase().includes(searchQuery) ||
        (task.notes && task.notes.toLowerCase().includes(searchQuery))
      );
    } catch (error) {
      throw new Error(`Failed to search tasks: ${error}`);
    }
  }

  async assignAgent(taskId: string, agentName: string): Promise<Task> {
    try {
      const agentTagName = `agent:${agentName.toLowerCase()}`;
      await this.ensureAndAddTag(taskId, agentTagName);
      return await this.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to assign agent: ${error}`);
    }
  }

  async unassignAgent(taskId: string): Promise<Task> {
    try {
      // Get current task to find agent tags
      const task = await this.getTask(taskId);
      const allTags = await this.listAllTags();

      // Remove any existing agent:* tags
      if (task.tags) {
        const agentTags = task.tags.filter(t => t.startsWith('agent:'));
        for (const agentTagName of agentTags) {
          const tag = allTags.find(t => t.name.toLowerCase() === agentTagName.toLowerCase());
          if (tag) {
            await this.removeTagFromTask(taskId, tag.gid);
          }
        }
      }

      return await this.getTask(taskId);
    } catch (error) {
      throw new Error(`Failed to unassign agent: ${error}`);
    }
  }

  async reassignAgent(taskId: string, newAgentName: string): Promise<Task> {
    try {
      // First unassign current agent
      await this.unassignAgent(taskId);

      // Then assign new agent
      return await this.assignAgent(taskId, newAgentName);
    } catch (error) {
      throw new Error(`Failed to reassign agent: ${error}`);
    }
  }

  /**
   * Applies filter options to task list.
   *
   * Args:
   *   tasks: Array of tasks to filter.
   *   filters: Optional filter options.
   *
   * Returns:
   *   Filtered array of tasks.
   */
  private applyFilters(tasks: Task[], filters?: ListFilters): Task[] {
    if (!filters) {
      return tasks;
    }

    let filtered = tasks;

    // Filter by completion status
    if (filters.completed !== undefined) {
      filtered = filtered.filter(t => t.completed === filters.completed);
    }

    // Filter by assignee
    if (filters.assignee) {
      const assigneeQuery = filters.assignee.toLowerCase();
      filtered = filtered.filter(t =>
        t.assignee && t.assignee.toLowerCase().includes(assigneeQuery)
      );
    }

    // Filter by agent
    if (filters.agent) {
      const agentTag = `agent:${filters.agent.toLowerCase()}`;
      filtered = filtered.filter(t =>
        t.tags && t.tags.some((tag: string) => tag.toLowerCase() === agentTag)
      );
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const filterTags = filters.tags.map(t => t.toLowerCase());
      filtered = filtered.filter(t =>
        t.tags && t.tags.some((tag: string) =>
          filterTags.some((filterTag: string) => tag.toLowerCase().includes(filterTag))
        )
      );
    }

    // Filter by section
    if (filters.section) {
      const sectionQuery = filters.section.toLowerCase();
      filtered = filtered.filter(t =>
        t.memberships && t.memberships.some(m =>
          m.section.name.toLowerCase().includes(sectionQuery)
        )
      );
    }

    // Filter by due date range
    if (filters.dueAfter) {
      filtered = filtered.filter(t => t.dueOn && t.dueOn >= filters.dueAfter!);
    }
    if (filters.dueBefore) {
      filtered = filtered.filter(t => t.dueOn && t.dueOn <= filters.dueBefore!);
    }

    // Filter by priority
    if (filters.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    // Search by query
    if (filters.query) {
      const searchQuery = filters.query.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery))
      );
    }

    // Apply custom filter function
    if (filters.customFilter) {
      filtered = filtered.filter(filters.customFilter);
    }

    return filtered;
  }

  /**
   * Fetches a single task by ID.
   *
   * Args:
   *   taskId: The task GID to fetch.
   *
   * Returns:
   *   The requested Task object.
   */
  private async getTask(taskId: string): Promise<Task> {
    try {
      const result = await this.tasksApi.getTask(taskId, {
        opt_fields: 'gid,name,notes,completed,due_on,start_on,assignee.name,assignee.gid,tags.name,parent.gid,num_subtasks',
      });

      const task = result.data;
      const tags = task.tags?.map((tag: any) => tag.name) || [];
      // Derive priority from priority:* tags
      const priorityTag = tags.find((t: string) => t.startsWith('priority:'));
      const priority = priorityTag ? priorityTag.split(':')[1] as ('low' | 'medium' | 'high') : undefined;

      return {
        gid: task.gid,
        name: task.name,
        notes: task.notes || undefined,
        completed: task.completed,
        dueOn: task.due_on || undefined,
        startOn: task.start_on || undefined,
        assignee: task.assignee?.name || undefined,
        assigneeGid: task.assignee?.gid || undefined,
        tags,
        parent: task.parent?.gid || undefined,
        numSubtasks: task.num_subtasks || undefined,
        priority,
      };
    } catch (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  /**
   * Lists all tags in the workspace.
   *
   * Returns:
   *   Array of Tag objects.
   */
  private async listAllTags(): Promise<Tag[]> {
    try {
      const result = await this.tagsApi.getTagsForWorkspace(this.workspaceId);
      return result.data.map((tag: any) => ({
        gid: tag.gid,
        name: tag.name,
      }));
    } catch (error) {
      throw new Error(`Failed to list tags: ${error}`);
    }
  }

  /**
   * Ensures a tag exists and adds it to a task.
   * Creates the tag if it doesn't exist, then adds it to the task.
   *
   * Args:
   *   taskId: The task GID to add the tag to.
   *   tagName: The tag name to ensure and add.
   */
  private async ensureAndAddTag(taskId: string, tagName: string): Promise<void> {
    try {
      // Find or create the tag
      const tags = await this.listAllTags();
      let tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

      if (!tag) {
        // Create the tag
        const result = await this.tagsApi.createTag({
          data: {
            name: tagName,
            workspace: this.workspaceId,
          },
        });

        tag = {
          gid: result.data.gid,
          name: result.data.name,
        };
      }

      // Add tag to task
      await this.tasksApi.addTagForTask({
        data: {
          tag: tag.gid,
        },
      }, taskId);
    } catch (error) {
      throw new Error(`Failed to ensure and add tag: ${error}`);
    }
  }

  /**
   * Removes a tag from a task.
   *
   * Args:
   *   taskId: The task GID.
   *   tagId: The tag GID to remove.
   */
  private async removeTagFromTask(taskId: string, tagId: string): Promise<void> {
    try {
      await this.tasksApi.removeTagForTask({
        data: {
          tag: tagId,
        },
      }, taskId);
    } catch (error) {
      throw new Error(`Failed to remove tag from task: ${error}`);
    }
  }
}
