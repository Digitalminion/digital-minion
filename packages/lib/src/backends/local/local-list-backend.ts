import { IListBackend, ListFilters } from '../core/list-backend';
import { Task } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';

/**
 * Local file-based implementation of the IListBackend interface.
 *
 * Provides advanced task querying, filtering, and agent assignment
 * management through tag-based conventions (agent:name tags).
 */
export class LocalListBackend extends LocalBackendBase implements IListBackend {
  private taskBackend: LocalTaskBackend;

  constructor(config: LocalConfig, taskBackend?: LocalTaskBackend) {
    super(config);
    this.taskBackend = taskBackend || new LocalTaskBackend(config);
  }

  async listTasks(filters?: ListFilters): Promise<Task[]> {
    try {
      let tasks = await this.taskBackend.listTasks();

      if (!filters) {
        return tasks;
      }

      return this.applyFilters(tasks, filters);
    } catch (error) {
      throw new Error(`Failed to list tasks: ${error}`);
    }
  }

  async searchTasks(query: string, filters?: ListFilters): Promise<Task[]> {
    try {
      let tasks = await this.taskBackend.listTasks();

      // Apply search query
      const lowerQuery = query.toLowerCase();
      tasks = tasks.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        (t.notes && t.notes.toLowerCase().includes(lowerQuery))
      );

      // Apply additional filters
      if (filters) {
        tasks = this.applyFilters(tasks, filters);
      }

      return tasks;
    } catch (error) {
      throw new Error(`Failed to search tasks: ${error}`);
    }
  }

  async assignAgent(taskId: string, agentName: string): Promise<Task> {
    try {
      const task = await this.taskBackend.getTask(taskId);
      const tags = task.tags || [];

      // Remove existing agent tags
      const filteredTags = tags.filter(t => !t.startsWith('agent:'));

      // Add new agent tag
      filteredTags.push(`agent:${agentName}`);

      return await this.taskBackend.updateTask(taskId, { tags: filteredTags });
    } catch (error) {
      throw new Error(`Failed to assign agent: ${error}`);
    }
  }

  async unassignAgent(taskId: string): Promise<Task> {
    try {
      const task = await this.taskBackend.getTask(taskId);
      const tags = task.tags || [];

      // Remove agent tags
      const filteredTags = tags.filter(t => !t.startsWith('agent:'));

      return await this.taskBackend.updateTask(taskId, { tags: filteredTags });
    } catch (error) {
      throw new Error(`Failed to unassign agent: ${error}`);
    }
  }

  async reassignAgent(taskId: string, newAgentName: string): Promise<Task> {
    try {
      // Simply call assignAgent which already removes old agent tags
      return await this.assignAgent(taskId, newAgentName);
    } catch (error) {
      throw new Error(`Failed to reassign agent: ${error}`);
    }
  }

  /**
   * Applies filters to a list of tasks.
   */
  private applyFilters(tasks: Task[], filters: ListFilters): Task[] {
    let filtered = tasks;

    // Apply completion filter
    if (filters.completed !== undefined) {
      filtered = filtered.filter(t => t.completed === filters.completed);
    }

    // Apply assignee filter
    if (filters.assignee) {
      filtered = filtered.filter(t =>
        t.assignee?.toLowerCase().includes(filters.assignee!.toLowerCase())
      );
    }

    // Apply agent filter (from tags)
    if (filters.agent) {
      const agentTag = `agent:${filters.agent.toLowerCase()}`;
      filtered = filtered.filter(t => {
        const taskTags = (t.tags || []).map(tag => tag.toLowerCase());
        return taskTags.some(tag => tag === agentTag);
      });
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(t => {
        const taskTags = t.tags || [];
        return filters.tags!.some(filterTag =>
          taskTags.some(taskTag => taskTag.toLowerCase() === filterTag.toLowerCase())
        );
      });
    }

    // Apply section filter
    if (filters.section) {
      filtered = filtered.filter(t => {
        if (!t.memberships || t.memberships.length === 0) return false;
        return t.memberships.some(m =>
          m.section.name.toLowerCase().includes(filters.section!.toLowerCase())
        );
      });
    }

    // Apply due date filters
    if (filters.dueBefore) {
      filtered = filtered.filter(t => t.dueOn && t.dueOn <= filters.dueBefore!);
    }

    if (filters.dueAfter) {
      filtered = filtered.filter(t => t.dueOn && t.dueOn >= filters.dueAfter!);
    }

    // Apply priority filter
    if (filters.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    // Apply search query filter
    if (filters.query) {
      const lowerQuery = filters.query.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        (t.notes && t.notes.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply custom filter
    if (filters.customFilter) {
      filtered = filtered.filter(filters.customFilter);
    }

    return filtered;
  }
}
