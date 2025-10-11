import { IBatchBackend } from '../core/batch-backend';
import { BatchOperation, BatchResult } from '../core/types';
import { LocalConfig, LocalBackendBase } from './local-config';
import { LocalTaskBackend } from './local-task-backend';
import { LocalTagBackend } from './local-tag-backend';
import { LocalSectionBackend } from './local-section-backend';

/**
 * Local file-based implementation of the IBatchBackend interface.
 *
 * Executes batch operations sequentially using the task, tag, and section
 * backends. Each operation is processed independently with detailed results.
 */
export class LocalBatchBackend extends LocalBackendBase implements IBatchBackend {
  private taskBackend: LocalTaskBackend;
  private tagBackend: LocalTagBackend;
  private sectionBackend: LocalSectionBackend;

  constructor(
    config: LocalConfig,
    taskBackend?: LocalTaskBackend,
    tagBackend?: LocalTagBackend,
    sectionBackend?: LocalSectionBackend
  ) {
    super(config);

    this.taskBackend = taskBackend || new LocalTaskBackend(config);
    this.tagBackend = tagBackend || new LocalTagBackend(config, this.taskBackend);
    this.sectionBackend = sectionBackend || new LocalSectionBackend(config, this.taskBackend);
  }

  async executeBatch(operations: BatchOperation[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (const operation of operations) {
      const result = await this.executeOperation(operation);
      results.push(result);
    }

    return results;
  }

  /**
   * Executes a single batch operation.
   */
  private async executeOperation(operation: BatchOperation): Promise<BatchResult> {
    const result: BatchResult = {
      operationId: operation.id,
      type: operation.type,
      success: true,
      tasksProcessed: operation.taskIds.length,
      tasksSucceeded: 0,
      tasksFailed: 0,
      taskResults: [],
    };

    for (const taskId of operation.taskIds) {
      try {
        await this.executeOperationOnTask(operation, taskId);
        result.tasksSucceeded++;
        result.taskResults?.push({
          taskId,
          success: true,
        });
      } catch (error) {
        result.tasksFailed++;
        result.taskResults?.push({
          taskId,
          success: false,
          error: String(error),
        });
      }
    }

    // Set overall success if at least one task succeeded
    result.success = result.tasksSucceeded > 0;

    // Add error message if all tasks failed
    if (result.tasksFailed === result.tasksProcessed) {
      result.error = 'All tasks in the batch operation failed';
    }

    return result;
  }

  /**
   * Executes a single operation on a single task.
   */
  private async executeOperationOnTask(operation: BatchOperation, taskId: string): Promise<void> {
    switch (operation.type) {
      case 'assign':
        if (!operation.params?.agentName) {
          throw new Error('Agent name is required for assign operation');
        }
        // Assign agent via tag convention (agent:name)
        const task = await this.taskBackend.getTask(taskId);
        const tags = task.tags || [];

        // Remove existing agent tags
        const filteredTags = tags.filter(t => !t.startsWith('agent:'));

        // Add new agent tag
        filteredTags.push(`agent:${operation.params.agentName}`);

        await this.taskBackend.updateTask(taskId, { tags: filteredTags });
        break;

      case 'unassign':
        // Remove agent tag
        const unassignTask = await this.taskBackend.getTask(taskId);
        const unassignTags = unassignTask.tags || [];
        const unassignFiltered = unassignTags.filter(t => !t.startsWith('agent:'));

        await this.taskBackend.updateTask(taskId, { tags: unassignFiltered });
        break;

      case 'complete':
        await this.taskBackend.completeTask(taskId);
        break;

      case 'move-section':
        if (!operation.params?.sectionId) {
          throw new Error('Section ID is required for move-section operation');
        }
        await this.sectionBackend.moveTaskToSection(taskId, operation.params.sectionId);
        break;

      case 'add-tag':
        if (!operation.params?.tagName) {
          throw new Error('Tag name is required for add-tag operation');
        }
        // Find or create the tag
        const allTags = await this.tagBackend.listTags();
        let tag = allTags.find(t => t.name.toLowerCase() === operation.params!.tagName!.toLowerCase());

        if (!tag) {
          tag = await this.tagBackend.createTag(operation.params.tagName);
        }

        await this.tagBackend.addTagToTask(taskId, tag.gid);
        break;

      case 'remove-tag':
        if (!operation.params?.tagName) {
          throw new Error('Tag name is required for remove-tag operation');
        }
        // Find the tag
        const tagsToRemove = await this.tagBackend.listTags();
        const tagToRemove = tagsToRemove.find(
          t => t.name.toLowerCase() === operation.params!.tagName!.toLowerCase()
        );

        if (tagToRemove) {
          await this.tagBackend.removeTagFromTask(taskId, tagToRemove.gid);
        }
        break;

      case 'update-task':
        if (!operation.params?.updates) {
          throw new Error('Updates are required for update-task operation');
        }
        await this.taskBackend.updateTask(taskId, operation.params.updates);
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
}
