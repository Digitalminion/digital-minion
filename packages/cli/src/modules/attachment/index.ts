import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { OutputFormatter } from '../../output';
import { CommandMetadata } from '../../types/command-metadata';
import { Backends } from '@digital-minion/lib';
import { addMetadataHelp } from '../../utils/command-help';

/**
 * Module for managing task attachments.
 */
export class AttachmentModule implements Module {
  name = 'attachment';
  description = 'Manage file and link attachments on tasks';

  metadata: CommandMetadata = {
    name: 'attachment',
    alias: 'at',
    summary: 'Manage file and link attachments on tasks',
    description: `Add files or URLs to tasks for documentation, reference, or collaboration.
View all attachments and remove them when no longer needed.`,
    subcommands: [
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all attachments on a task',
        description: 'Shows all attachments on a task, including files and URLs, with their names, types, sizes, and download links.',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID'
          }
        ],
        examples: [
          {
            description: 'List all attachments on a task',
            command: 'dm attachment list 1234567890'
          },
          {
            description: 'List attachments and parse as JSON',
            command: 'dm -o json attachment list 1234567890 | jq \'.attachments[]\''
          }
        ],
        notes: [
          'Finding documentation or references',
          'Checking what files are attached',
          'Getting download URLs for attachments'
        ]
      },
      {
        name: 'add-url',
        summary: 'Attach a URL/link to a task',
        description: 'Adds a URL as an attachment to a task. Useful for linking to documentation, specifications, or external resources.',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID'
          },
          {
            name: 'url',
            required: true,
            type: 'string',
            description: 'The URL to attach'
          }
        ],
        options: [
          {
            short: '-n',
            long: '--name',
            description: 'Custom name for the attachment',
            takesValue: true,
            valueType: 'string',
            valueName: '<name>'
          }
        ],
        examples: [
          {
            description: 'Attach a URL to a task',
            command: 'dm attachment add-url 1234567890 https://example.com'
          },
          {
            description: 'Attach a URL with custom name',
            command: 'dm attachment add-url 1234567890 https://docs.com/spec --name "API Spec"'
          }
        ]
      },
      {
        name: 'add-file',
        summary: 'Upload a file attachment to a task',
        description: 'Uploads a local file as an attachment to a task. Supports images, documents, and other file types.',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID'
          },
          {
            name: 'filePath',
            required: true,
            type: 'string',
            description: 'Local path to the file'
          }
        ],
        options: [
          {
            short: '-n',
            long: '--name',
            description: 'Custom name for the attachment',
            takesValue: true,
            valueType: 'string',
            valueName: '<name>'
          }
        ],
        examples: [
          {
            description: 'Upload a PDF document',
            command: 'dm attachment add-file 1234567890 ./document.pdf'
          },
          {
            description: 'Upload an image with custom name',
            command: 'dm attachment add-file 1234567890 ~/screenshot.png --name "Bug Screenshot"'
          }
        ]
      },
      {
        name: 'delete',
        alias: 'rm',
        summary: 'Delete an attachment',
        description: 'Removes an attachment from a task. Requires the attachment GID, which can be found using the list command.',
        arguments: [
          {
            name: 'attachmentId',
            required: true,
            type: 'string',
            description: 'The attachment GID to delete'
          }
        ],
        examples: [
          {
            description: 'Delete an attachment',
            command: 'dm attachment delete 9876543210'
          }
        ],
        relatedCommands: ['attachment list']
      }
    ],
    notes: [
      'Attach documentation for reference',
      'Link to external specs or requirements',
      'Upload screenshots for bug reports',
      'Share design files or mockups',
      'Attachments are stored in Asana and accessible from the web UI',
      'Use list command to get attachment GIDs for deletion'
    ]
  };

  register(program: Command): void {
    const attachCmd = program
      .command('attachment')
      .alias('at')
      .description(this.metadata.summary);

    // Add progressive help support
    addMetadataHelp(attachCmd, this.metadata);

    attachCmd
      .command('list <taskId>')
      .alias('ls')
      .description(`List all attachments on a task

Arguments:
  taskId - The task GID

Examples:
  dm attachment list 1234567890
  dm -o json attachment list 1234567890 | jq '.attachments[]'`)
      .action(async (taskId) => {
        await this.listAttachments(taskId);
      });

    attachCmd
      .command('add-url <taskId> <url>')
      .description(`Attach a URL/link to a task

Arguments:
  taskId - The task GID
  url    - The URL to attach

Options:
  -n, --name <name>  - Custom name for the attachment

Examples:
  dm attachment add-url 1234567890 https://example.com
  dm attachment add-url 1234567890 https://docs.com/spec --name "API Spec"`)
      .option('-n, --name <name>', 'Custom name for the attachment')
      .action(async (taskId, url, options) => {
        await this.addUrl(taskId, url, options.name);
      });

    attachCmd
      .command('add-file <taskId> <filePath>')
      .description(`Upload a file attachment to a task

Arguments:
  taskId   - The task GID
  filePath - Local path to the file

Options:
  -n, --name <name>  - Custom name for the attachment

Examples:
  dm attachment add-file 1234567890 ./document.pdf
  dm attachment add-file 1234567890 ~/screenshot.png --name "Bug Screenshot"`)
      .option('-n, --name <name>', 'Custom name for the attachment')
      .action(async (taskId, filePath, options) => {
        await this.addFile(taskId, filePath, options.name);
      });

    attachCmd
      .command('delete <attachmentId>')
      .alias('rm')
      .description(`Delete an attachment

Arguments:
  attachmentId - The attachment GID to delete

Example:
  dm attachment delete 9876543210`)
      .action(async (attachmentId) => {
        await this.deleteAttachment(attachmentId);
      });
  }

  private getBackend() {
    return BackendProvider.getInstance().getAttachmentBackend();
  }

  private async listAttachments(taskId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const attachments = await backend.listAttachments(taskId);

      if (attachments.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ attachments: [], count: 0 });
        } else {
          console.log('\nNo attachments found.');
          console.log();
        }
        return;
      }

      OutputFormatter.print(
        { attachments, count: attachments.length },
        () => {
          console.log(`\nAttachments (${attachments.length}):\n`);
          attachments.forEach(att => {
            console.log(`[${att.gid}] ${att.name}`);
            if (att.host) console.log(`  Host: ${att.host}`);
            if (att.resourceType) console.log(`  Type: ${att.resourceType}`);
            if (att.size) console.log(`  Size: ${(att.size / 1024).toFixed(2)} KB`);
            if (att.permanentUrl) console.log(`  URL: ${att.permanentUrl}`);
            console.log();
          });
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing attachments: ${error}`);
    }
  }

  private async addUrl(taskId: string, url: string, name?: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const attachment = await backend.attachUrl(taskId, url, name);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ attachment });
      } else {
        console.log(`\n✓ URL attached: ${attachment.name}`);
        if (attachment.permanentUrl) console.log(`  View: ${attachment.permanentUrl}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error attaching URL: ${error}`);
    }
  }

  private async addFile(taskId: string, filePath: string, name?: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const attachment = await backend.attachFile(taskId, filePath, name);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ attachment });
      } else {
        console.log(`\n✓ File attached: ${attachment.name}`);
        if (attachment.size) console.log(`  Size: ${(attachment.size / 1024).toFixed(2)} KB`);
        if (attachment.permanentUrl) console.log(`  View: ${attachment.permanentUrl}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error attaching file: ${error}`);
    }
  }

  private async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      const backend = this.getBackend();
      await backend.deleteAttachment(attachmentId);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ success: true });
      } else {
        console.log(`\n✓ Attachment deleted`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error deleting attachment: ${error}`);
    }
  }
}
