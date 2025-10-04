import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson } from '../../types/command-metadata';

/**
 * Module for managing projects, briefs, and memberships.
 */
export class ProjectModule implements Module {
  name = 'project';
  description = 'Manage projects, documentation, and team members';

  metadata: CommandMetadata = {
    name: 'project',
    alias: 'pj',
    summary: 'Manage projects, documentation, and team members',
    description: `Projects are workspaces for organizing tasks, tracking progress, and collaborating with team members. Use projects to group related work, maintain documentation, and manage team access.`,
    subcommands: [
      {
        name: 'info',
        summary: 'Get project information',
        description: 'Displays detailed information about a project including name, description, owner, status, and dates.',
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
            description: 'Get info for configured project',
            command: 'dm project info'
          },
          {
            description: 'Get info for specific project',
            command: 'dm project info 1234567890'
          }
        ]
      },
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all projects in the workspace',
        description: 'Shows all projects in your workspace including their owners, statuses, and due dates.',
        examples: [
          {
            description: 'List all projects',
            command: 'dm project list'
          },
          {
            description: 'List projects and parse as JSON',
            command: 'dm -o json project list | jq \'.projects[]\''
          }
        ]
      },
      {
        name: 'create',
        summary: 'Create a new project',
        description: 'Creates a new project in your workspace with an optional description and color.',
        arguments: [
          {
            name: 'name',
            required: true,
            type: 'string',
            description: 'Project name'
          }
        ],
        options: [
          {
            short: '-n',
            long: '--notes',
            description: 'Project description',
            takesValue: true,
            valueType: 'string',
            valueName: '<notes>'
          },
          {
            short: '-c',
            long: '--color',
            description: 'Project color',
            takesValue: true,
            valueType: 'string',
            valueName: '<color>'
          }
        ],
        examples: [
          {
            description: 'Create a simple project',
            command: 'dm project create "Q1 2025 Goals"'
          },
          {
            description: 'Create project with description',
            command: 'dm project create "Website Redesign" --notes "Redesign company website"'
          }
        ]
      },
      {
        name: 'brief',
        summary: 'Manage project briefs (knowledge articles)',
        description: 'Project briefs are knowledge articles that document project goals, context, and important information.',
        subcommands: [
          {
            name: 'get',
            summary: 'Get project brief',
            description: 'Retrieves the project brief for a project, displaying its title and content.',
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
                description: 'Get brief for configured project',
                command: 'dm project brief get'
              },
              {
                description: 'Get brief for specific project',
                command: 'dm project brief get 1234567890'
              }
            ]
          },
          {
            name: 'create',
            summary: 'Create a project brief',
            description: 'Creates a new project brief with a title and optional text content.',
            arguments: [
              {
                name: 'title',
                required: true,
                type: 'string',
                description: 'Brief title'
              }
            ],
            options: [
              {
                short: '-t',
                long: '--text',
                description: 'Brief text content',
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
                description: 'Create a brief',
                command: 'dm project brief create "Project Overview"'
              },
              {
                description: 'Create brief with content',
                command: 'dm project brief create "Goals & Objectives" --text "Our main goals are..."'
              }
            ]
          },
          {
            name: 'update',
            summary: 'Update a project brief',
            description: 'Updates an existing project brief\'s title or text content.',
            arguments: [
              {
                name: 'briefGid',
                required: true,
                type: 'string',
                description: 'Brief GID to update'
              }
            ],
            options: [
              {
                long: '--title',
                description: 'New title',
                takesValue: true,
                valueType: 'string',
                valueName: '<title>'
              },
              {
                short: '-t',
                long: '--text',
                description: 'New text content',
                takesValue: true,
                valueType: 'string',
                valueName: '<text>'
              }
            ],
            examples: [
              {
                description: 'Update brief title and content',
                command: 'dm project brief update 9876543210 --title "New Title" --text "Updated content"'
              }
            ]
          },
          {
            name: 'delete',
            alias: 'rm',
            summary: 'Delete a project brief',
            description: 'Deletes a project brief.',
            arguments: [
              {
                name: 'briefGid',
                required: true,
                type: 'string',
                description: 'Brief GID to delete'
              }
            ],
            examples: [
              {
                description: 'Delete a brief',
                command: 'dm project brief delete 9876543210'
              }
            ]
          }
        ]
      },
      {
        name: 'members',
        summary: 'Manage project team members',
        description: 'Manage who has access to a project and their permissions.',
        subcommands: [
          {
            name: 'list',
            alias: 'ls',
            summary: 'List project members',
            description: 'Shows all members of a project and their access levels.',
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
                description: 'List members of configured project',
                command: 'dm project members list'
              },
              {
                description: 'List members of specific project',
                command: 'dm project members list 1234567890'
              }
            ]
          },
          {
            name: 'add',
            summary: 'Add a member to the project',
            description: 'Adds a user to the project, granting them access.',
            arguments: [
              {
                name: 'userGid',
                required: true,
                type: 'string',
                description: 'User GID to add'
              }
            ],
            options: [
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
                description: 'Add member to configured project',
                command: 'dm project members add 1111111111'
              },
              {
                description: 'Add member to specific project',
                command: 'dm project members add 1111111111 --project 1234567890'
              }
            ]
          },
          {
            name: 'remove',
            alias: 'rm',
            summary: 'Remove a member from the project',
            description: 'Removes a user from the project, revoking their access.',
            arguments: [
              {
                name: 'userGid',
                required: true,
                type: 'string',
                description: 'User GID to remove'
              }
            ],
            options: [
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
                description: 'Remove member from configured project',
                command: 'dm project members remove 1111111111'
              },
              {
                description: 'Remove member from specific project',
                command: 'dm project members remove 1111111111 --project 1234567890'
              }
            ]
          }
        ]
      }
    ],
    notes: [
      'Projects organize related tasks and enable team collaboration',
      'Use briefs to document project goals and context',
      'Manage team access by adding/removing members',
      'Project GID can be configured in settings or passed explicitly'
    ]
  };

  register(program: Command): void {
    const projectCmd = program
      .command('project')
      .alias('pj')
      .description(`Manage projects, documentation, and team members

Projects are workspaces for organizing tasks, tracking progress, and
collaborating with team members.`);

    // Add metadata help support
    projectCmd.option('--help-json', 'Output command help as JSON');

    // Override help to support JSON output
    const originalHelp = projectCmd.helpInformation.bind(projectCmd);
    projectCmd.helpInformation = () => {
      const opts = projectCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    // Project info commands
    projectCmd
      .command('info [projectGid]')
      .description(`Get project information

Arguments:
  projectGid - Optional project GID (defaults to configured project)

Example:
  dm project info
  dm project info 1234567890`)
      .action(async (projectGid) => {
        await this.getProjectInfo(projectGid);
      });

    projectCmd
      .command('list')
      .alias('ls')
      .description(`List all projects in the workspace

Example:
  dm project list
  dm -o json project list | jq '.projects[]'`)
      .action(async () => {
        await this.listProjects();
      });

    projectCmd
      .command('create <name>')
      .description(`Create a new project

Arguments:
  name - Project name

Options:
  -n, --notes <notes>  - Project description
  -c, --color <color>  - Project color

Examples:
  dm project create "Q1 2025 Goals"
  dm project create "Website Redesign" --notes "Redesign company website"`)
      .option('-n, --notes <notes>', 'Project description')
      .option('-c, --color <color>', 'Project color')
      .action(async (name, options) => {
        await this.createProject(name, options);
      });

    // Project brief commands
    const briefCmd = projectCmd
      .command('brief')
      .description('Manage project briefs (knowledge articles)');

    briefCmd
      .command('get [projectGid]')
      .description(`Get project brief

Arguments:
  projectGid - Optional project GID (defaults to configured project)

Example:
  dm project brief get
  dm project brief get 1234567890`)
      .action(async (projectGid) => {
        await this.getProjectBrief(projectGid);
      });

    briefCmd
      .command('create <title>')
      .description(`Create a project brief

Arguments:
  title - Brief title

Options:
  -t, --text <text>       - Brief text content
  -p, --project <gid>     - Project GID (defaults to configured project)

Examples:
  dm project brief create "Project Overview"
  dm project brief create "Goals & Objectives" --text "Our main goals are..."`)
      .option('-t, --text <text>', 'Brief text content')
      .option('-p, --project <gid>', 'Project GID')
      .action(async (title, options) => {
        await this.createProjectBrief(title, options);
      });

    briefCmd
      .command('update <briefGid>')
      .description(`Update a project brief

Arguments:
  briefGid - Brief GID to update

Options:
  --title <title>  - New title
  -t, --text <text>  - New text content

Example:
  dm project brief update 9876543210 --title "New Title" --text "Updated content"`)
      .option('--title <title>', 'New title')
      .option('-t, --text <text>', 'New text content')
      .action(async (briefGid, options) => {
        await this.updateProjectBrief(briefGid, options);
      });

    briefCmd
      .command('delete <briefGid>')
      .alias('rm')
      .description(`Delete a project brief

Arguments:
  briefGid - Brief GID to delete

Example:
  dm project brief delete 9876543210`)
      .action(async (briefGid) => {
        await this.deleteProjectBrief(briefGid);
      });

    // Project members commands
    const membersCmd = projectCmd
      .command('members')
      .description('Manage project team members');

    membersCmd
      .command('list [projectGid]')
      .alias('ls')
      .description(`List project members

Arguments:
  projectGid - Optional project GID (defaults to configured project)

Example:
  dm project members list
  dm project members list 1234567890`)
      .action(async (projectGid) => {
        await this.listProjectMembers(projectGid);
      });

    membersCmd
      .command('add <userGid>')
      .description(`Add a member to the project

Arguments:
  userGid - User GID to add

Options:
  -p, --project <gid>  - Project GID (defaults to configured project)

Example:
  dm project members add 1111111111
  dm project members add 1111111111 --project 1234567890`)
      .option('-p, --project <gid>', 'Project GID')
      .action(async (userGid, options) => {
        await this.addProjectMember(userGid, options);
      });

    membersCmd
      .command('remove <userGid>')
      .alias('rm')
      .description(`Remove a member from the project

Arguments:
  userGid - User GID to remove

Options:
  -p, --project <gid>  - Project GID (defaults to configured project)

Example:
  dm project members remove 1111111111
  dm project members remove 1111111111 --project 1234567890`)
      .option('-p, --project <gid>', 'Project GID')
      .action(async (userGid, options) => {
        await this.removeProjectMember(userGid, options);
      });
  }

  private getBackend() {
    return BackendProvider.getInstance().getProjectBackend();
  }

  private getProjectGid(providedGid?: string): string {
    if (providedGid) return providedGid;

    const configManager = new ConfigManager();
    const config = configManager.load();

    if (!config?.asana?.projectId) {
      console.error('✗ No project configured. Please run "dm init" or provide project GID.');
      process.exit(1);
    }

    return config.asana.projectId;
  }

  private async getProjectInfo(projectGid?: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const gid = this.getProjectGid(projectGid);
      const project = await backend.getProject(gid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ project });
      } else {
        console.log(`\nProject: ${project.name} [${project.gid}]`);
        if (project.notes) console.log(`  Description: ${project.notes}`);
        if (project.owner) console.log(`  Owner: ${project.owner}`);
        if (project.color) console.log(`  Color: ${project.color}`);
        if (project.currentStatus) console.log(`  Status: ${project.currentStatus}`);
        if (project.dueOn) console.log(`  Due: ${project.dueOn}`);
        if (project.startOn) console.log(`  Start: ${project.startOn}`);
        if (project.archived) console.log(`  Archived: Yes`);
        if (project.permalinkUrl) console.log(`  URL: ${project.permalinkUrl}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error getting project info: ${error}`);
    }
  }

  private async listProjects(): Promise<void> {
    try {
      const backend = this.getBackend();
      const projects = await backend.listProjects();

      if (projects.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ projects: [], count: 0 });
        } else {
          console.log('\nNo projects found.');
          console.log();
        }
        return;
      }

      OutputFormatter.print(
        { projects, count: projects.length },
        () => {
          console.log(`\nProjects (${projects.length}):\n`);
          projects.forEach(proj => {
            const archived = proj.archived ? ' [ARCHIVED]' : '';
            console.log(`[${proj.gid}] ${proj.name}${archived}`);
            if (proj.owner) console.log(`  Owner: ${proj.owner}`);
            if (proj.currentStatus) console.log(`  Status: ${proj.currentStatus}`);
            if (proj.dueOn) console.log(`  Due: ${proj.dueOn}`);
            console.log();
          });
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing projects: ${error}`);
    }
  }

  private async createProject(name: string, options: any): Promise<void> {
    try {
      const backend = this.getBackend();
      const project = await backend.createProject(name, options.notes, options.color);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ project });
      } else {
        console.log(`\n✓ Project created: ${project.name} [${project.gid}]`);
        if (project.permalinkUrl) console.log(`  URL: ${project.permalinkUrl}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error creating project: ${error}`);
    }
  }

  private async getProjectBrief(projectGid?: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const gid = this.getProjectGid(projectGid);
      const brief = await backend.getProjectBrief(gid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ brief });
      } else {
        console.log(`\nProject Brief [${brief.gid}]`);
        if (brief.title) console.log(`  Title: ${brief.title}`);
        if (brief.text) {
          console.log(`  Content:`);
          console.log(`  ${brief.text.split('\n').join('\n  ')}`);
        }
        if (brief.permalinkUrl) console.log(`  URL: ${brief.permalinkUrl}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error getting project brief: ${error}`);
    }
  }

  private async createProjectBrief(title: string, options: any): Promise<void> {
    try {
      const backend = this.getBackend();
      const projectGid = this.getProjectGid(options.project);
      const brief = await backend.createProjectBrief(projectGid, title, options.text);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ brief });
      } else {
        console.log(`\n✓ Project brief created: ${brief.title} [${brief.gid}]`);
        if (brief.permalinkUrl) console.log(`  URL: ${brief.permalinkUrl}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error creating project brief: ${error}`);
    }
  }

  private async updateProjectBrief(briefGid: string, options: any): Promise<void> {
    try {
      const backend = this.getBackend();
      const brief = await backend.updateProjectBrief(briefGid, options.title, options.text);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ brief });
      } else {
        console.log(`\n✓ Project brief updated: ${brief.title}`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error updating project brief: ${error}`);
    }
  }

  private async deleteProjectBrief(briefGid: string): Promise<void> {
    try {
      const backend = this.getBackend();
      await backend.deleteProjectBrief(briefGid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ success: true });
      } else {
        console.log(`\n✓ Project brief deleted`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error deleting project brief: ${error}`);
    }
  }

  private async listProjectMembers(projectGid?: string): Promise<void> {
    try {
      const backend = this.getBackend();
      const gid = this.getProjectGid(projectGid);
      const members = await backend.listProjectMembers(gid);

      if (members.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ members: [], count: 0 });
        } else {
          console.log('\nNo members found.');
          console.log();
        }
        return;
      }

      OutputFormatter.print(
        { members, count: members.length },
        () => {
          console.log(`\nProject Members (${members.length}):\n`);
          members.forEach(member => {
            console.log(`[${member.gid}] ${member.userName || member.user}`);
            if (member.accessLevel) console.log(`  Access: ${member.accessLevel}`);
            console.log();
          });
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing project members: ${error}`);
    }
  }

  private async addProjectMember(userGid: string, options: any): Promise<void> {
    try {
      const backend = this.getBackend();
      const projectGid = this.getProjectGid(options.project);
      await backend.addProjectMember(projectGid, userGid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ success: true });
      } else {
        console.log(`\n✓ Member added to project`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error adding project member: ${error}`);
    }
  }

  private async removeProjectMember(userGid: string, options: any): Promise<void> {
    try {
      const backend = this.getBackend();
      const projectGid = this.getProjectGid(options.project);
      await backend.removeProjectMember(projectGid, userGid);

      if (OutputFormatter.isJson()) {
        OutputFormatter.print({ success: true });
      } else {
        console.log(`\n✓ Member removed from project`);
        console.log();
      }
    } catch (error) {
      OutputFormatter.error(`Error removing project member: ${error}`);
    }
  }
}
