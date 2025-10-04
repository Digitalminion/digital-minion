import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson } from '../../types/command-metadata';

/**
 * Module for managing users in the workspace.
 */
export class UserModule implements Module {
  name = 'user';
  description = 'Manage and search workspace users';

  metadata: CommandMetadata = {
    name: 'user',
    alias: 'us',
    summary: 'Manage and search workspace users',
    description: `Users are team members in your workspace. Use these commands to find users for task assignment and collaboration.`,
    subcommands: [
      {
        name: 'me',
        summary: 'Get current authenticated user info',
        description: 'Retrieves information about the currently authenticated user, including their name, email, and workspaces.',
        examples: [
          {
            description: 'Get current user info',
            command: 'dm user me'
          },
          {
            description: 'Get current user as JSON',
            command: 'dm -o json user me | jq \'.user\''
          }
        ]
      },
      {
        name: 'get',
        summary: 'Get user information by GID',
        description: 'Retrieves detailed information about a specific user using their GID.',
        arguments: [
          {
            name: 'userGid',
            required: true,
            type: 'string',
            description: 'User GID to retrieve'
          }
        ],
        examples: [
          {
            description: 'Get user by GID',
            command: 'dm user get 1234567890'
          },
          {
            description: 'Extract user email',
            command: 'dm -o json user get 1234567890 | jq \'.user.email\''
          }
        ]
      },
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all users in the workspace',
        description: 'Shows all users in your workspace with their names, GIDs, and email addresses.',
        examples: [
          {
            description: 'List all users',
            command: 'dm user list'
          },
          {
            description: 'List users with name and email',
            command: 'dm -o json user list | jq \'.users[] | {name, email}\''
          }
        ],
        notes: [
          'Finding team members for task assignment',
          'Getting user GIDs for automation',
          'Reviewing workspace membership'
        ]
      },
      {
        name: 'find',
        summary: 'Find user by email address',
        description: 'Searches for a user by their email address and returns their information if found.',
        arguments: [
          {
            name: 'email',
            required: true,
            type: 'string',
            description: 'Email address to search for'
          }
        ],
        examples: [
          {
            description: 'Find user by email',
            command: 'dm user find john@example.com'
          },
          {
            description: 'Get user GID from email',
            command: 'dm -o json user find john@example.com | jq \'.user.gid\''
          }
        ],
        notes: [
          'Quickly find user GID from email',
          'Useful for scripting task assignments'
        ]
      }
    ],
    notes: [
      'Use "dm user me" to get your own user GID',
      'User GIDs are needed for task assignment',
      'Email search is case-insensitive',
      'All users in your workspace are visible'
    ]
  };

  register(program: Command): void {
    const userCmd = program
      .command('user')
      .alias('us')
      .description(`Manage and search workspace users

Users are team members in your workspace. Use these commands to find users
for task assignment and collaboration.`);

    // Add metadata help support
    userCmd.option('--help-json', 'Output command help as JSON');

    // Override help to support JSON output
    const originalHelp = userCmd.helpInformation.bind(userCmd);
    userCmd.helpInformation = () => {
      const opts = userCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    userCmd
      .command('me')
      .description(`Get current authenticated user info

Example:
  dm user me
  dm -o json user me | jq '.user'`)
      .action(async () => {
        await this.getCurrentUser();
      });

    userCmd
      .command('get <userGid>')
      .description(`Get user information by GID

Arguments:
  userGid - User GID to retrieve

Example:
  dm user get 1234567890
  dm -o json user get 1234567890 | jq '.user.email'`)
      .action(async (userGid) => {
        await this.getUser(userGid);
      });

    userCmd
      .command('list')
      .alias('ls')
      .description(`List all users in the workspace

Example:
  dm user list
  dm -o json user list | jq '.users[] | {name, email}'`)
      .action(async () => {
        await this.listUsers();
      });

    userCmd
      .command('find <email>')
      .description(`Find user by email address

Arguments:
  email - Email address to search for

Example:
  dm user find john@example.com
  dm -o json user find john@example.com | jq '.user.gid'`)
      .action(async (email) => {
        await this.findUserByEmail(email);
      });
  }

  private getBackend() {
    return BackendProvider.getInstance().getUserBackend();
  }

  private async getCurrentUser(): Promise<void> {
    try {
      const backend = this.getBackend();
      const user = await backend.getCurrentUser();

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ user });
      } else {
        console.log(`\nCurrent User: ${user.name} [${user.gid}]`);
        if (user.email) console.log(`  Email: ${user.email}`);
        if (user.photo) console.log(`  Photo: ${user.photo}`);
        if (user.workspaces) {
          console.log(`  Workspaces:`);
          user.workspaces.forEach(ws => {
            console.log(`    - ${ws.name} [${ws.gid}]`);
          });
        }
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error getting current user: ${error}`);
    }
  }

  private async getUser(userGid: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const user = await backend.getUser(userGid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ user });
      } else {
        console.log(`\nUser: ${user.name} [${user.gid}]`);
        if (user.email) console.log(`  Email: ${user.email}`);
        if (user.photo) console.log(`  Photo: ${user.photo}`);
        if (user.workspaces) {
          console.log(`  Workspaces:`);
          user.workspaces.forEach(ws => {
            console.log(`    - ${ws.name} [${ws.gid}]`);
          });
        }
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error getting user: ${error}`);
    }
  }

  private async listUsers(): Promise<void> {
    try {
      const backend = this.getBackend();
      const users = await backend.listUsers();

      if (users.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ users: [], count: 0 });
        } else {
          console.log('\nNo users found.');
          console.log();
        }
        return;
      }

      OutputFormatter.print(
        { users, count: users.length },
        () => {
          console.log(`\nWorkspace Users (${users.length}):\n`);
          users.forEach(user => {
            console.log(`[${user.gid}] ${user.name}`);
            if (user.email) console.log(`  Email: ${user.email}`);
            console.log();
          });
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing users: ${error}`);
    }
  }

  private async findUserByEmail(email: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const user = await backend.findUserByEmail(email);

      if (!user) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ user: null, found: false });
        } else {
          console.log(`\n✗ No user found with email: ${email}`);
          console.log();
        }
        return;
      }

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ user, found: true });
      } else {
        console.log(`\nFound User: ${user.name} [${user.gid}]`);
        if (user.email) console.log(`  Email: ${user.email}`);
        if (user.photo) console.log(`  Photo: ${user.photo}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error finding user by email: ${error}`);
    }
  }
}
