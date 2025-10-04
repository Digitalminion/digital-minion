const Asana = require('asana');
import { IBatchBackend } from '../core/batch-backend';
import { BatchOperation, BatchResult, Tag } from '../core/types';
import { AsanaConfig, AsanaBackendBase } from './asana-config';

/**
 * Asana-based implementation of the IBatchBackend interface.
 *
 * Provides batch operation functionality using the Asana API as the backend
 * storage system. Handles executing multiple operations in a single batch
 * request for improved performance and atomic operations.
 */
export class AsanaBatchBackend extends AsanaBackendBase implements IBatchBackend {
  private tasksApi: any;
  private sectionsApi: any;
  private tagsApi: any;

  constructor(config: AsanaConfig) {
    super(config);
    this.tasksApi = new Asana.TasksApi();
    this.sectionsApi = new Asana.SectionsApi();
    this.tagsApi = new Asana.TagsApi();
  }

  async executeBatch(operations: BatchOperation[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (const operation of operations) {
      const result: BatchResult = {
        operationId: operation.id,
        type: operation.type,
        success: false,
        tasksProcessed: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        taskResults: [],
      };

      try {
        // Process each task in the operation
        for (const taskId of operation.taskIds) {
          result.tasksProcessed++;

          try {
            switch (operation.type) {
              case 'assign':
                if (!operation.params?.agentName) {
                  throw new Error('agentName required for assign operation');
                }
                const assignTagName = `agent:${operation.params.agentName}`;
                const tags = await this.listTags();
                let agentTag = tags.find(t => t.name.toLowerCase() === assignTagName.toLowerCase());
                if (!agentTag) {
                  agentTag = await this.createTag(assignTagName);
                }
                await this.addTagToTask(taskId, agentTag.gid);
                break;

              case 'unassign':
                const task = await this.getTask(taskId);
                const agentTags = task.tags?.filter((tagName: string) => tagName.toLowerCase().startsWith('agent:')) || [];
                const allTags = await this.listTags();
                for (const agentTagName of agentTags) {
                  const tag = allTags.find(t => t.name.toLowerCase() === agentTagName.toLowerCase());
                  if (tag) {
                    await this.removeTagFromTask(taskId, tag.gid);
                  }
                }
                break;

              case 'complete':
                await this.completeTask(taskId);
                break;

              case 'move-section':
                if (!operation.params?.sectionId) {
                  throw new Error('sectionId required for move-section operation');
                }
                await this.moveTaskToSection(taskId, operation.params.sectionId);
                break;

              case 'add-tag':
                if (!operation.params?.tagName) {
                  throw new Error('tagName required for add-tag operation');
                }
                const addTagName = operation.params.tagName;
                const addTags = await this.listTags();
                let addTag = addTags.find(t => t.name.toLowerCase() === addTagName.toLowerCase());
                if (!addTag) {
                  addTag = await this.createTag(addTagName);
                }
                await this.addTagToTask(taskId, addTag.gid);
                break;

              case 'remove-tag':
                if (!operation.params?.tagName) {
                  throw new Error('tagName required for remove-tag operation');
                }
                const removeTagName = operation.params.tagName;
                const removeTags = await this.listTags();
                const removeTag = removeTags.find(t => t.name.toLowerCase() === removeTagName.toLowerCase());
                if (removeTag) {
                  await this.removeTagFromTask(taskId, removeTag.gid);
                }
                break;

              case 'update-task':
                if (!operation.params?.updates) {
                  throw new Error('updates required for update-task operation');
                }
                await this.updateTask(taskId, operation.params.updates);
                break;

              default:
                throw new Error(`Unknown operation type: ${operation.type}`);
            }

            result.tasksSucceeded++;
            result.taskResults?.push({ taskId, success: true });
          } catch (taskError) {
            result.tasksFailed++;
            result.taskResults?.push({
              taskId,
              success: false,
              error: String(taskError)
            });
          }
        }

        // Mark operation as successful if at least one task succeeded
        result.success = result.tasksSucceeded > 0;
      } catch (error) {
        result.success = false;
        result.error = String(error);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Helper method to get a task.
   */
  private async getTask(taskId: string): Promise<any> {
    try {
      const result = await this.tasksApi.getTask(taskId, {
        opt_fields: 'gid,name,tags.name',
      });

      const task = result.data;
      return {
        gid: task.gid,
        name: task.name,
        tags: task.tags?.map((tag: any) => tag.name) || [],
      };
    } catch (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  /**
   * Helper method to complete a task.
   */
  private async completeTask(taskId: string): Promise<void> {
    try {
      await this.tasksApi.updateTask(
        { data: { completed: true } },
        taskId,
        {
          opt_fields: 'gid',
        }
      );
    } catch (error) {
      throw new Error(`Failed to complete task: ${error}`);
    }
  }

  /**
   * Helper method to move task to section.
   */
  private async moveTaskToSection(taskId: string, sectionId: string): Promise<void> {
    try {
      // Use the tasks API to add the task to the section
      await this.tasksApi.addProjectForTask(
        { data: { project: this.projectId, section: sectionId } },
        taskId
      );
    } catch (error) {
      throw new Error(`Failed to move task to section: ${error}`);
    }
  }

  /**
   * Helper method to update a task.
   */
  private async updateTask(taskId: string, updates: any): Promise<void> {
    try {
      const taskData: any = {};

      if (updates.name !== undefined) taskData.name = updates.name;
      if (updates.notes !== undefined) taskData.notes = updates.notes;
      if (updates.dueOn !== undefined) taskData.due_on = updates.dueOn;
      if (updates.startOn !== undefined) taskData.start_on = updates.startOn;

      // Update standard fields if any
      if (Object.keys(taskData).length > 0) {
        await this.tasksApi.updateTask({ data: taskData }, taskId, {
          opt_fields: 'gid',
        });
      }

      // Handle priority via tags
      if (updates.priority !== undefined) {
        await this.updatePriorityTag(taskId, updates.priority);
      }
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  /**
   * Helper method to list all tags in the workspace.
   */
  private async listTags(): Promise<Tag[]> {
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
   * Helper method to create a tag.
   */
  private async createTag(name: string): Promise<Tag> {
    try {
      const result = await this.tagsApi.createTag({
        data: {
          name,
          workspace: this.workspaceId,
        },
      });

      return {
        gid: result.data.gid,
        name: result.data.name,
      };
    } catch (error) {
      throw new Error(`Failed to create tag: ${error}`);
    }
  }

  /**
   * Helper method to add a tag to a task.
   */
  private async addTagToTask(taskId: string, tagId: string): Promise<void> {
    try {
      await this.tasksApi.addTagForTask({
        data: {
          tag: tagId,
        },
      }, taskId);
    } catch (error) {
      throw new Error(`Failed to add tag to task: ${error}`);
    }
  }

  /**
   * Helper method to remove a tag from a task.
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

  /**
   * Helper method to update priority via tags.
   * Removes existing priority:* tags and adds the new one.
   */
  private async updatePriorityTag(taskId: string, priority: string): Promise<void> {
    try {
      // Get current task to see existing priority tags
      const task = await this.getTask(taskId);
      const allTags = await this.listTags();

      // Remove any existing priority:* tags
      if (task.tags) {
        const priorityTags = task.tags.filter((t: string) => t.startsWith('priority:'));
        for (const priorityTagName of priorityTags) {
          const tag = allTags.find(t => t.name.toLowerCase() === priorityTagName.toLowerCase());
          if (tag) {
            await this.removeTagFromTask(taskId, tag.gid);
          }
        }
      }

      // Add new priority tag
      const newPriorityTag = `priority:${priority}`;
      await this.ensureAndAddTag(taskId, newPriorityTag);
    } catch (error) {
      throw new Error(`Failed to update priority tag: ${error}`);
    }
  }

  /**
   * Helper method to ensure a tag exists and add it to a task.
   * Creates the tag if it doesn't exist, then adds it to the task.
   */
  private async ensureAndAddTag(taskId: string, tagName: string): Promise<void> {
    try {
      // Find or create the tag
      const tags = await this.listTags();
      let tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

      if (!tag) {
        tag = await this.createTag(tagName);
      }

      // Add tag to task
      await this.addTagToTask(taskId, tag.gid);
    } catch (error) {
      throw new Error(`Failed to ensure and add tag: ${error}`);
    }
  }
}
