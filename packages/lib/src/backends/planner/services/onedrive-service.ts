import { IGraphClient } from '../graph-client';

/**
 * Represents a file stored in OneDrive/SharePoint
 */
export interface DriveItem {
  id: string;
  name: string;
  size?: number;
  webUrl: string;
  downloadUrl?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  '@microsoft.graph.downloadUrl'?: string;
}

/**
 * Represents a sharing link for a file
 */
export interface SharingLink {
  type: 'view' | 'edit' | 'embed';
  scope: 'anonymous' | 'organization';
  webUrl: string;
  webHtml?: string;
}

/**
 * Service for OneDrive/SharePoint file operations.
 *
 * Encapsulates all file upload, download, and sharing operations
 * for Microsoft 365 Group drives.
 */
export class OneDriveService {
  constructor(
    private graphClient: IGraphClient,
    private groupId: string
  ) {}

  /**
   * Upload a file to the group's drive
   *
   * @param content - File content as Buffer or string
   * @param fileName - Name for the file
   * @param folderPath - Optional folder path (e.g., 'Attachments/Tasks')
   * @returns The created DriveItem
   */
  async uploadFile(
    content: Buffer | string,
    fileName: string,
    folderPath?: string
  ): Promise<DriveItem> {
    try {
      // Build the path
      const path = folderPath
        ? `/groups/${this.groupId}/drive/root:/${folderPath}/${fileName}:/content`
        : `/groups/${this.groupId}/drive/root:/${fileName}:/content`;

      const result = await this.graphClient.putContent<DriveItem>(path, content);

      return result;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Create a folder in the group's drive
   *
   * @param folderName - Name of the folder
   * @param parentPath - Optional parent folder path
   * @returns The created folder DriveItem
   */
  async createFolder(folderName: string, parentPath?: string): Promise<DriveItem> {
    try {
      const parentEndpoint = parentPath
        ? `/groups/${this.groupId}/drive/root:/${parentPath}:/children`
        : `/groups/${this.groupId}/drive/root/children`;

      const result = await this.graphClient.post<DriveItem>(
        parentEndpoint,
        {
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to create folder: ${error}`);
    }
  }

  /**
   * Get a file by ID
   *
   * @param fileId - The file's drive item ID
   * @returns The DriveItem
   */
  async getFile(fileId: string): Promise<DriveItem> {
    try {
      const result = await this.graphClient.get<DriveItem>(
        `/groups/${this.groupId}/drive/items/${fileId}`
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to get file: ${error}`);
    }
  }

  /**
   * Create a sharing link for a file
   *
   * @param fileId - The file's drive item ID
   * @param type - Link type (view, edit, embed)
   * @param scope - Link scope (anonymous, organization)
   * @returns Sharing link information
   */
  async createSharingLink(
    fileId: string,
    type: 'view' | 'edit' | 'embed' = 'view',
    scope: 'anonymous' | 'organization' = 'organization'
  ): Promise<SharingLink> {
    try {
      const result = await this.graphClient.post<{ link: SharingLink }>(
        `/groups/${this.groupId}/drive/items/${fileId}/createLink`,
        {
          type,
          scope,
        }
      );

      return result.link;
    } catch (error) {
      throw new Error(`Failed to create sharing link: ${error}`);
    }
  }

  /**
   * Delete a file
   *
   * @param fileId - The file's drive item ID
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.graphClient.delete(`/groups/${this.groupId}/drive/items/${fileId}`);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * List files in a folder
   *
   * @param folderPath - Optional folder path (defaults to root)
   * @returns Array of DriveItems
   */
  async listFiles(folderPath?: string): Promise<DriveItem[]> {
    try {
      const endpoint = folderPath
        ? `/groups/${this.groupId}/drive/root:/${folderPath}:/children`
        : `/groups/${this.groupId}/drive/root/children`;

      const result = await this.graphClient.get<{ value: DriveItem[] }>(endpoint);

      return result.value;
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  /**
   * Ensure a folder exists (create if it doesn't)
   *
   * @param folderPath - Path to the folder
   * @returns The folder DriveItem
   */
  async ensureFolder(folderPath: string): Promise<DriveItem> {
    try {
      // Try to get the folder first
      const result = await this.graphClient.get<DriveItem>(
        `/groups/${this.groupId}/drive/root:/${folderPath}`
      );
      return result;
    } catch (error) {
      // Folder doesn't exist, create it
      const pathParts = folderPath.split('/');
      const folderName = pathParts.pop()!;
      const parentPath = pathParts.length > 0 ? pathParts.join('/') : undefined;

      return await this.createFolder(folderName, parentPath);
    }
  }
}
