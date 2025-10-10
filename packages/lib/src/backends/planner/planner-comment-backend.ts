import { ICommentBackend } from '../core/comment-backend';
import { Comment } from '../core/types';
import { PlannerConfig, PlannerBackendBase } from './planner-config';
import { GroupsService } from './services/groups-service';

/**
 * Represents a Planner task with conversation thread
 */
interface PlannerTask {
  id: string;
  title: string;
  conversationThreadId?: string;
  '@odata.etag': string;
}

/**
 * Microsoft Planner-based implementation of the ICommentBackend interface.
 *
 * Provides comment management functionality using the Microsoft Graph API,
 * including creating comments and listing comments on tasks.
 *
 * Note: Planner uses Microsoft 365 Group conversations for task comments.
 * The conversationThreadId is stored on the task and points to a thread
 * in the group's conversations.
 */
export class PlannerCommentBackend extends PlannerBackendBase implements ICommentBackend {
  private groupsService: GroupsService;

  constructor(config: PlannerConfig) {
    super(config);
    this.groupsService = new GroupsService(this.graphClient, this.groupId);
  }

  async listComments(taskId: string): Promise<Comment[]> {
    try {
      // Get the task to find its conversation thread ID
      const task = await this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`);

      // If no conversation thread exists, there are no comments
      if (!task.conversationThreadId) {
        return [];
      }

      // Fetch posts from the conversation thread
      const posts = await this.groupsService.listPosts(task.conversationThreadId);

      // Convert posts to comments
      return posts.map((post) => ({
        gid: post.id,
        text: this.groupsService.stripHtml(post.body.content),
        createdBy: post.from?.emailAddress?.name,
        createdAt: post.receivedDateTime || post.createdDateTime,
      }));
    } catch (error) {
      throw new Error(`Failed to list comments: ${error}`);
    }
  }

  async createComment(taskId: string, text: string): Promise<Comment> {
    try {
      // Get the task to check for existing conversation
      const task = await this.graphClient.get<PlannerTask>(`/planner/tasks/${taskId}`);

      const htmlContent = this.groupsService.textToHtml(text);

      if (!task.conversationThreadId) {
        // Create a new conversation thread for this task
        const thread = await this.groupsService.createThread(
          task.title,
          htmlContent
        );

        // Update the task with the conversation thread ID
        await this.updateTaskConversationThread(taskId, thread.id, task['@odata.etag']);

        // Return the comment (we'll use the thread ID as comment ID)
        return {
          gid: thread.id,
          text: text,
          createdAt: new Date().toISOString(),
        };
      } else {
        // Reply to existing thread
        const post = await this.groupsService.replyToThread(
          task.conversationThreadId,
          htmlContent
        );

        return {
          gid: post.id,
          text: text,
          createdBy: post.from?.emailAddress?.name,
          createdAt: post.receivedDateTime || post.createdDateTime,
        };
      }
    } catch (error) {
      throw new Error(`Failed to create comment: ${error}`);
    }
  }

  /**
   * Update task with conversation thread ID
   */
  private async updateTaskConversationThread(
    taskId: string,
    threadId: string,
    etag: string
  ): Promise<void> {
    try {
      await this.graphClient.patch<PlannerTask>(
        `/planner/tasks/${taskId}`,
        {
          conversationThreadId: threadId,
        },
        {
          headers: { 'If-Match': etag },
        }
      );
    } catch (error) {
      throw new Error(`Failed to update task conversation thread: ${error}`);
    }
  }
}
