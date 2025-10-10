import { IGraphClient } from '../graph-client';

/**
 * Represents a conversation thread in a Microsoft 365 Group
 */
export interface ConversationThread {
  id: string;
  topic: string;
  lastDeliveredDateTime?: string;
  preview?: string;
  hasAttachments?: boolean;
}

/**
 * Represents a post in a conversation thread
 */
export interface ConversationPost {
  id: string;
  body: {
    contentType: 'html' | 'text';
    content: string;
  };
  from?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime?: string;
  createdDateTime?: string;
}

/**
 * Service for Microsoft 365 Groups operations.
 *
 * Encapsulates all group conversation/comment operations,
 * which are used for Planner task comments.
 */
export class GroupsService {
  constructor(
    private graphClient: IGraphClient,
    private groupId: string
  ) {}

  /**
   * Create a new conversation thread
   *
   * @param topic - Thread topic/title
   * @param messageBody - Initial message content
   * @returns The created thread
   */
  async createThread(topic: string, messageBody: string): Promise<ConversationThread> {
    try {
      const result = await this.graphClient.post<ConversationThread>(
        `/groups/${this.groupId}/threads`,
        {
          topic,
          posts: [
            {
              body: {
                contentType: 'html',
                content: messageBody,
              },
            },
          ],
        }
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to create conversation thread: ${error}`);
    }
  }

  /**
   * Get a conversation thread by ID
   *
   * @param threadId - The thread ID
   * @returns The conversation thread
   */
  async getThread(threadId: string): Promise<ConversationThread> {
    try {
      const result = await this.graphClient.get<ConversationThread>(
        `/groups/${this.groupId}/threads/${threadId}`
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to get conversation thread: ${error}`);
    }
  }

  /**
   * List all posts in a thread
   *
   * @param threadId - The thread ID
   * @returns Array of posts
   */
  async listPosts(threadId: string): Promise<ConversationPost[]> {
    try {
      const result = await this.graphClient.get<{ value: ConversationPost[] }>(
        `/groups/${this.groupId}/threads/${threadId}/posts`,
        {
          select: ['id', 'body', 'from', 'receivedDateTime', 'createdDateTime'],
        }
      );

      return result.value;
    } catch (error) {
      throw new Error(`Failed to list thread posts: ${error}`);
    }
  }

  /**
   * Reply to a conversation thread
   *
   * @param threadId - The thread ID
   * @param messageBody - Reply message content
   * @returns The created post
   */
  async replyToThread(threadId: string, messageBody: string): Promise<ConversationPost> {
    try {
      const result = await this.graphClient.post<ConversationPost>(
        `/groups/${this.groupId}/threads/${threadId}/reply`,
        {
          post: {
            body: {
              contentType: 'html',
              content: messageBody,
            },
          },
        }
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to reply to thread: ${error}`);
    }
  }

  /**
   * Strip HTML tags from content
   *
   * Utility method to convert HTML content to plain text
   *
   * @param html - HTML content
   * @returns Plain text content
   */
  stripHtml(html: string): string {
    if (!html) return '';

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return text.trim();
  }

  /**
   * Convert plain text to HTML
   *
   * Utility method to prepare text for posting to conversations
   *
   * @param text - Plain text
   * @returns HTML formatted content
   */
  textToHtml(text: string): string {
    if (!text) return '';

    // Escape HTML entities
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Convert newlines to <br>
    html = html.replace(/\n/g, '<br>');

    return `<div>${html}</div>`;
  }
}
