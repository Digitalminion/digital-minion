import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson } from '../../types/command-metadata';

/**
 * Module for managing project status updates.
 */
export class StatusModule implements Module {
  name = 'status';
  description = 'Manage project status updates';

  metadata: CommandMetadata = {
    name: 'status',
    alias: 'su',
    summary: 'Manage project status updates',
    description: `Status updates provide progress information about projects, goals, or portfolios.
They're sent to all followers when created and help keep stakeholders informed.`,
    subcommands: [
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all status updates for a project',
        description: 'Shows all status updates for a project with their status type, author, creation date, and text.',
        arguments: [
          {
            name: 'projectGid',
            required: false,
            type: 'string',
            description: 'Project GID (defaults to configured project)'
          }
        ],
        examples: [
          {
            description: 'List status updates for configured project',
            command: 'dm status list'
          },
          {
            description: 'List status updates for specific project',
            command: 'dm status list 1234567890'
          },
          {
            description: 'List updates and parse as JSON',
            command: 'dm -o json status list | jq \'.updates[]\''
          }
        ]
      },
      {
        name: 'create',
        summary: 'Create a new status update',
        description: 'Creates a new status update for a project. Status updates are sent to all project followers.',
        arguments: [
          {
            name: 'title',
            required: true,
            type: 'string',
            description: 'Status update title'
          },
          {
            name: 'statusType',
            required: true,
            type: 'string',
            description: 'Status type (on_track, at_risk, off_track, on_hold)'
          }
        ],
        options: [
          {
            short: '-t',
            long: '--text',
            description: 'Status update text/description',
            takesValue: true,
            valueType: 'string',
            valueName: '<text>'
          },
          {
            short: '-p',
            long: '--project',
            description: 'Project GID (defaults to configured project)',
            takesValue: true,
            valueType: 'string',
            valueName: '<gid>'
          }
        ],
        examples: [
          {
            description: 'Create on-track status update',
            command: 'dm status create "Sprint 10 Complete" on_track --text "All stories delivered"'
          },
          {
            description: 'Create at-risk status update',
            command: 'dm status create "API Migration" at_risk --text "Deadline approaching"'
          },
          {
            description: 'Create on-hold status update',
            command: 'dm status create "Design Review" on_hold'
          }
        ],
        notes: [
          'Valid status types: on_track, at_risk, off_track, on_hold',
          'Status updates are sent to all project followers',
          'Cannot be modified after creation, only deleted'
        ]
      },
      {
        name: 'get',
        summary: 'Get a specific status update',
        description: 'Retrieves and displays a specific status update by its GID.',
        arguments: [
          {
            name: 'statusGid',
            required: true,
            type: 'string',
            description: 'The status update GID'
          }
        ],
        examples: [
          {
            description: 'Get status update details',
            command: 'dm status get 9876543210'
          }
        ]
      },
      {
        name: 'delete',
        alias: 'rm',
        summary: 'Delete a status update',
        description: 'Permanently deletes a status update. Status updates cannot be modified, only created or deleted.',
        arguments: [
          {
            name: 'statusGid',
            required: true,
            type: 'string',
            description: 'The status update GID to delete'
          }
        ],
        examples: [
          {
            description: 'Delete a status update',
            command: 'dm status delete 9876543210'
          }
        ],
        notes: [
          'Status updates cannot be modified, only created or deleted'
        ]
      }
    ],
    notes: [
      'Keep stakeholders informed about project progress',
      'Status types: on_track (✓), at_risk (⚠), off_track (✗), on_hold (⏸)',
      'Updates are sent to all project followers',
      'Cannot be modified after creation',
      'Use regular updates to maintain transparency',
      'Include specific details in the text field'
    ]
  };

  register(program: Command): void {
    const statusCmd = program
      .command('status')
      .alias('su')
      .description(`Manage project status updates

Status updates provide progress information about projects, goals, or portfolios.
They're sent to all followers when created and help keep stakeholders informed.

Status Types:
  on_track  - Project is progressing as expected
  at_risk   - Project is facing potential challenges
  off_track - Project is behind schedule
  on_hold   - Project is temporarily paused`);

    // Add metadata help support
    statusCmd.option('--help-json', 'Output command help as JSON');

    // Override help to support JSON output
    const originalHelp = statusCmd.helpInformation.bind(statusCmd);
    statusCmd.helpInformation = () => {
      const opts = statusCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    statusCmd
      .command('list [projectGid]')
      .alias('ls')
      .description(`List all status updates for a project

Arguments:
  projectGid - Optional project GID (defaults to configured project)

Examples:
  dm status list
  dm status list 1234567890
  dm -o json status list | jq '.updates[]'`)
      .action(async (projectGid) => {
        await this.listUpdates(projectGid);
      });

    statusCmd
      .command('create <title> <statusType>')
      .description(`Create a new status update

Arguments:
  title      - Status update title
  statusType - Status type (on_track, at_risk, off_track, on_hold)

Options:
  -t, --text <text>     - Status update text/description
  -p, --project <gid>   - Project GID (defaults to configured project)

Examples:
  dm status create "Sprint 10 Complete" on_track --text "All stories delivered"
  dm status create "API Migration" at_risk --text "Deadline approaching"
  dm status create "Design Review" on_hold`)
      .option('-t, --text <text>', 'Status update text/description')
      .option('-p, --project <gid>', 'Project GID')
      .action(async (title, statusType, options) => {
        await this.createUpdate(title, statusType, options);
      });

    statusCmd
      .command('get <statusGid>')
      .description(`Get a specific status update

Arguments:
  statusGid - The status update GID

Example:
  dm status get 9876543210`)
      .action(async (statusGid) => {
        await this.getUpdate(statusGid);
      });

    statusCmd
      .command('delete <statusGid>')
      .alias('rm')
      .description(`Delete a status update

Arguments:
  statusGid - The status update GID to delete

Example:
  dm status delete 9876543210

Note: Status updates cannot be modified, only created or deleted.`)
      .action(async (statusGid) => {
        await this.deleteUpdate(statusGid);
      });
  }

  private getBackend() {
    return BackendProvider.getInstance().getStatusBackend();
  }

  private getProjectGid(providedGid?: string): string {
    if (providedGid) return providedGid;

    const configManager = new ConfigManager();
    const config = configManager.load();

    if (!config?.asana?.projectId) {
      console.error('✗ No project configured. Please run "dm init" or provide --project flag.');
      process.exit(1);
    }

    return config.asana.projectId;
  }

  private async listUpdates(projectGid?: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const gid = this.getProjectGid(projectGid);
      const updates = await backend.listStatusUpdates(gid);

      if (updates.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ updates: [], count: 0 });
        } else {
          console.log('\nNo status updates found.');
          console.log();
        }
        return;
      }

      OutputFormatter.print(
        { updates, count: updates.length },
        () => {
          console.log(`\nStatus Updates (${updates.length}):\n`);
          updates.forEach(update => {
            const statusEmoji = {
              on_track: '✓',
              at_risk: '⚠',
              off_track: '✗',
              on_hold: '⏸'
            }[update.statusType] || '•';

            console.log(`${statusEmoji} [${update.gid}] ${update.title}`);
            console.log(`  Status: ${update.statusType}`);
            if (update.author) console.log(`  Author: ${update.author}`);
            if (update.createdAt) {
              const date = new Date(update.createdAt).toLocaleString();
              console.log(`  Created: ${date}`);
            }
            if (update.text) console.log(`  Text: ${update.text}`);
            console.log();
          });
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing status updates: ${error}`);
    }
  }

  private async createUpdate(title: string, statusType: string, options: any): Promise<void> {
    try {
      const backend = this.getBackend();
      const projectGid = this.getProjectGid(options.project);

      const validStatuses = ['on_track', 'at_risk', 'off_track', 'on_hold'];
      if (!validStatuses.includes(statusType)) {
        console.error(`✗ Invalid status type. Must be: ${validStatuses.join(', ')}`);
        process.exit(1);
      }

      const update = await backend.createStatusUpdate(
        projectGid,
        title,
        statusType,
        options.text
      );

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ update });
      } else {
        const statusEmoji = {
          on_track: '✓',
          at_risk: '⚠',
          off_track: '✗',
          on_hold: '⏸'
        }[update.statusType] || '•';

        console.log(`\n${statusEmoji} Status update created: ${update.title}`);
        console.log(`  Status: ${update.statusType}`);
        if (update.text) console.log(`  Text: ${update.text}`);
        console.log(`  GID: ${update.gid}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error creating status update: ${error}`);
    }
  }

  private async getUpdate(statusGid: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const update = await backend.getStatusUpdate(statusGid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ update });
      } else {
        const statusEmoji = {
          on_track: '✓',
          at_risk: '⚠',
          off_track: '✗',
          on_hold: '⏸'
        }[update.statusType] || '•';

        console.log(`\n${statusEmoji} ${update.title} [${update.gid}]`);
        console.log(`  Status: ${update.statusType}`);
        if (update.author) console.log(`  Author: ${update.author}`);
        if (update.createdAt) {
          const date = new Date(update.createdAt).toLocaleString();
          console.log(`  Created: ${date}`);
        }
        if (update.text) console.log(`  Text: ${update.text}`);
        if (update.htmlText) console.log(`  (HTML version available in JSON output)`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error getting status update: ${error}`);
    }
  }

  private async deleteUpdate(statusGid: string): Promise<void> {
    try {
      const backend = this.getBackend();
      await backend.deleteStatusUpdate(statusGid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ success: true });
      } else {
        console.log(`\n✓ Status update deleted`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error deleting status update: ${error}`);
    }
  }
}
