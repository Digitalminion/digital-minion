import { IAttachmentBackend } from '../core/attachment-backend';
import { Attachment } from '../core/types';
import { PlannerConfig, PlannerBackendBase } from './planner-config';
import { OneDriveService } from './services/onedrive-service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents task details with references
 */
interface PlannerTaskDetails {
  id: string;
  references?: Record<string, {
    alias: string;
    type: string;
    previewPriority: string;
    lastModifiedDateTime: string;
    lastModifiedBy: { user: { id: string; displayName: string } };
  }>;
  '@odata.etag': string;
}

/**
 * Microsoft Planner-based implementation of the IAttachmentBackend interface.
 *
 * Integrates OneDrive/SharePoint for file storage. Files are uploaded to the
 * group's drive and then linked as references in the Planner task details.
 */
export class PlannerAttachmentBackend extends PlannerBackendBase implements IAttachmentBackend {
  private oneDriveService: OneDriveService;

  constructor(config: PlannerConfig) {
    super(config);
    this.oneDriveService = new OneDriveService(this.graphClient, this.groupId);
  }

  async listAttachments(taskId: string): Promise<Attachment[]> {
    try {
      const details = await this.getTaskDetails(taskId);

      if (!details || !details.references) {
        return [];
      }

      // Convert references to attachments
      return Object.entries(details.references).map(([url, ref]) => ({
        gid: url, // Use URL as ID
        name: ref.alias || url,
        permanentUrl: url,
        resourceType: ref.type || 'external',
        createdAt: ref.lastModifiedDateTime,
      }));
    } catch (error) {
      throw new Error(`Failed to list attachments: ${error}`);
    }
  }

  async attachUrl(taskId: string, url: string, name?: string): Promise<Attachment> {
    try {
      const attachmentName = name || url;

      // Add reference to task details
      await this.addReferenceToTask(taskId, url, attachmentName);

      return {
        gid: url,
        name: attachmentName,
        permanentUrl: url,
        resourceType: 'external',
      };
    } catch (error) {
      throw new Error(`Failed to add attachment: ${error}`);
    }
  }

  async attachFile(taskId: string, filePath: string, name?: string): Promise<Attachment> {
    // Reuse the uploadFile method
    return this.uploadFile(taskId, filePath, name);
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    // Note: This requires knowing the parent task ID which we don't have
    // For now, throw an error
    throw new Error(
      'Planner attachments cannot be deleted by ID alone. ' +
      'Use deleteAttachmentFromTask(taskId, attachmentId) instead.'
    );
  }

  /**
   * Delete an attachment from a specific task
   *
   * Extension method - required because Planner references
   * are stored per-task
   *
   * @param taskId - The parent task ID
   * @param attachmentId - The attachment URL/ID to remove
   */
  async deleteAttachmentFromTask(taskId: string, attachmentId: string): Promise<void> {
    try {
      // In Planner, attachmentId is the URL
      await this.removeReferenceFromTask(taskId, attachmentId);
    } catch (error) {
      throw new Error(`Failed to remove attachment: ${error}`);
    }
  }

  /**
   * Upload a file and attach it to a task
   *
   * This is an extension method that goes beyond the core interface.
   * Uploads a file to OneDrive/SharePoint and adds it as a reference.
   *
   * @param taskId - The task ID
   * @param filePath - Local path to the file
   * @param fileName - Optional custom filename
   * @returns The created attachment
   */
  async uploadFile(taskId: string, filePath: string, fileName?: string): Promise<Attachment> {
    try {
      // Read file content
      const content = fs.readFileSync(filePath);
      const name = fileName || path.basename(filePath);

      // Upload to OneDrive in a Planner-specific folder
      const uploadedFile = await this.oneDriveService.uploadFile(
        content,
        name,
        'Planner Attachments'
      );

      // Create a sharing link
      const sharingLink = await this.oneDriveService.createSharingLink(
        uploadedFile.id,
        'view',
        'organization'
      );

      // Add reference to task
      await this.addReferenceToTask(taskId, sharingLink.webUrl, name);

      return {
        gid: uploadedFile.id,
        name: uploadedFile.name,
        size: uploadedFile.size,
        permanentUrl: sharingLink.webUrl,
        downloadUrl: uploadedFile['@microsoft.graph.downloadUrl'],
        resourceType: 'onedrive',
        createdAt: uploadedFile.createdDateTime,
        parent: taskId,
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Get task details
   */
  private async getTaskDetails(taskId: string): Promise<PlannerTaskDetails | null> {
    try {
      const details = await this.graphClient.get<PlannerTaskDetails>(
        `/planner/tasks/${taskId}/details`
      );
      return details;
    } catch (error) {
      return null;
    }
  }

  /**
   * Add a reference to a task
   */
  private async addReferenceToTask(
    taskId: string,
    url: string,
    alias: string
  ): Promise<void> {
    try {
      await this.withEtag(
        () => this.graphClient.get<PlannerTaskDetails>(`/planner/tasks/${taskId}/details`),
        (etag) =>
          this.graphClient.patch<PlannerTaskDetails>(
            `/planner/tasks/${taskId}/details`,
            {
              references: {
                [url]: {
                  '@odata.type': '#microsoft.graph.plannerExternalReference',
                  alias: alias,
                  type: 'Other',
                  previewPriority: ' !',
                },
              },
            },
            { headers: { 'If-Match': etag } }
          )
      );
    } catch (error) {
      throw new Error(`Failed to add reference to task: ${error}`);
    }
  }

  /**
   * Remove a reference from a task
   */
  private async removeReferenceFromTask(taskId: string, url: string): Promise<void> {
    try {
      await this.withEtag(
        () => this.graphClient.get<PlannerTaskDetails>(`/planner/tasks/${taskId}/details`),
        (etag) =>
          this.graphClient.patch<PlannerTaskDetails>(
            `/planner/tasks/${taskId}/details`,
            {
              references: {
                [url]: null, // Setting to null removes the reference
              },
            },
            { headers: { 'If-Match': etag } }
          )
      );
    } catch (error) {
      throw new Error(`Failed to remove reference from task: ${error}`);
    }
  }
}
