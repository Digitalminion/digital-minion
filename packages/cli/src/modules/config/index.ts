import { Command } from 'commander';
import prompts from 'prompts';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { BackendType, MinionConfig, AsanaConfig } from '../../config/types';
import { AsanaClient } from './asana-client';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson } from '../../types/command-metadata';

/**
 * Module for managing CLI configuration.
 *
 * Provides initialization wizard and commands to switch between workspaces,
 * teams, and projects. Handles credential collection, validation, and
 * context switching for multiple Asana environments.
 */
export class ConfigModule implements Module {
  name = 'config';
  description = 'Initialize and manage CLI configuration';

  metadata: CommandMetadata = {
    name: 'config',
    alias: 'cfg',
    summary: 'Initialize and manage CLI configuration',
    description: 'Initialize CLI configuration or switch between workspaces, teams, and projects. Handles setup and context switching for Asana environments.',
    subcommands: [
      {
        name: 'init',
        summary: 'Bootstrap your local environment for task management',
        description: 'Interactive setup wizard for configuring the Digital Minion CLI. Guides you through selecting and configuring a task management backend (Asana or local). For Asana, this includes validating your personal access token, selecting workspace, choosing team, and picking a project.',
        examples: [
          { description: 'Start the interactive configuration wizard', command: 'dm config init' },
          { description: 'Reconfigure your environment', command: 'dm config init' }
        ],
        notes: [
          'Configuration is stored in .minion directory',
          'You can reinitialize at any time to change settings',
          'Asana personal access tokens can be created at: https://app.asana.com/0/my-apps',
          'The wizard will prompt before overwriting existing configuration'
        ]
      },
      {
        name: 'show',
        summary: 'Show current configuration',
        description: 'Displays the current workspace, team, and project configuration.',
        examples: [
          { description: 'Show current config', command: 'dm config show' },
          { description: 'Show config as JSON', command: 'dm -o json config show' }
        ]
      },
      {
        name: 'workspace',
        summary: 'Switch to a different workspace',
        description: 'Interactively select and switch to a different Asana workspace. This will also prompt you to select a new team and project.',
        examples: [
          { description: 'Switch workspace', command: 'dm config workspace' }
        ],
        notes: [
          'Switching workspace requires selecting new team and project',
          'Uses existing access token from configuration'
        ]
      },
      {
        name: 'team',
        summary: 'Switch to a different team',
        description: 'Interactively select and switch to a different team within the current workspace. This will also prompt you to select a new project.',
        examples: [
          { description: 'Switch team', command: 'dm config team' }
        ],
        notes: [
          'Switching team requires selecting new project',
          'Stays in current workspace'
        ]
      },
      {
        name: 'project',
        summary: 'Switch to a different project',
        description: 'Interactively select and switch to a different project within the current team.',
        examples: [
          { description: 'Switch project', command: 'dm config project' }
        ],
        notes: [
          'Stays in current workspace and team'
        ]
      }
    ],
    notes: [
      'Start with "dm config init" or "dm init" to set up configuration',
      'Switch commands require existing configuration',
      'Configuration changes are saved immediately',
      'Use "dm config show" to verify current context'
    ],
    relatedCommands: ['task', 'subtask', 'list']
  };

  register(program: Command): void {
    const configCmd = program
      .command('config')
      .alias('cfg')
      .description(`Initialize and manage CLI configuration

Initialize your environment or switch between workspaces, teams, and projects.

Commands:
  init      - Initialize CLI configuration (first-time setup)
  show      - Display current configuration
  workspace - Switch to a different workspace
  team      - Switch to a different team
  project   - Switch to a different project`);

    // Add metadata help support
    configCmd.option('--help-json', 'Output command help as JSON');

    // Override help to support JSON output
    const originalHelp = configCmd.helpInformation.bind(configCmd);
    configCmd.helpInformation = () => {
      const opts = configCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    // Initialize configuration (also available as top-level 'init' command for backwards compatibility)
    configCmd
      .command('init')
      .description('Bootstrap your local environment for task management')
      .action(async () => {
        await this.initCmd();
      });

    // Top-level 'init' command for backwards compatibility
    program
      .command('init')
      .description('Bootstrap your local environment for task management (alias for "config init")')
      .action(async () => {
        await this.initCmd();
      });

    // Show current configuration
    configCmd
      .command('show')
      .description('Show current configuration')
      .action(async () => {
        await this.showConfigCmd();
      });

    // Switch workspace
    configCmd
      .command('workspace')
      .description('Switch to a different workspace')
      .action(async () => {
        await this.switchWorkspaceCmd();
      });

    // Switch team
    configCmd
      .command('team')
      .description('Switch to a different team')
      .action(async () => {
        await this.switchTeamCmd();
      });

    // Switch project
    configCmd
      .command('project')
      .description('Switch to a different project')
      .action(async () => {
        await this.switchProjectCmd();
      });
  }

  private getConfigOrExit(): { manager: ConfigManager; config: any } {
    const configManager = new ConfigManager();
    const config = configManager.load();

    if (!config) {
      console.error('✗ No configuration found. Please run "dm init" first.');
      process.exit(1);
    }

    if (config.backend !== 'asana' || !config.asana) {
      console.error('✗ Only Asana backend is supported for context switching.');
      process.exit(1);
    }

    return { manager: configManager, config };
  }

  private async showConfigCmd(): Promise<void> {
    const { config } = this.getConfigOrExit();

    if (OutputFormatter.isJson()) {
      OutputFormatter.print({
        backend: config.backend,
        workspace: {
          id: config.asana!.workspaceId,
          name: config.asana!.workspaceName
        },
        team: {
          id: config.asana!.teamId,
          name: config.asana!.teamName
        },
        project: {
          id: config.asana!.projectId,
          name: config.asana!.projectName
        }
      });
    } else {
      console.log('\nCurrent Configuration:');
      console.log('=====================\n');
      console.log(`Backend:   ${config.backend}`);
      console.log(`Workspace: ${config.asana!.workspaceName} [${config.asana!.workspaceId}]`);
      console.log(`Team:      ${config.asana!.teamName} [${config.asana!.teamId}]`);
      console.log(`Project:   ${config.asana!.projectName} [${config.asana!.projectId}]`);
      console.log();
    }
  }

  private async switchWorkspaceCmd(): Promise<void> {
    const { manager: configManager, config } = this.getConfigOrExit();

    console.log('\nSwitching workspace...\n');

    const client = new AsanaClient(config.asana!.accessToken);

    // Fetch workspaces
    console.log('Fetching workspaces...');
    const workspaces = await client.getWorkspaces();

    if (workspaces.length === 0) {
      console.error('✗ No workspaces found for this account.');
      return;
    }

    const workspaceResponse = await prompts({
      type: 'select',
      name: 'workspace',
      message: 'Select a workspace:',
      choices: workspaces.map((ws) => ({
        title: ws.name,
        value: ws,
      })),
    });

    if (!workspaceResponse.workspace) {
      console.log('Cancelled.');
      return;
    }

    const selectedWorkspace = workspaceResponse.workspace;
    console.log(`\n✓ Selected workspace: ${selectedWorkspace.name}\n`);

    // Fetch teams
    console.log('Fetching teams...');
    const teams = await client.getTeams(selectedWorkspace.gid);

    if (teams.length === 0) {
      console.error('✗ No teams found in this workspace.');
      return;
    }

    const teamResponse = await prompts({
      type: 'select',
      name: 'team',
      message: 'Select a team:',
      choices: teams.map((team) => ({
        title: team.name,
        value: team,
      })),
    });

    if (!teamResponse.team) {
      console.log('Cancelled.');
      return;
    }

    const selectedTeam = teamResponse.team;
    console.log(`\n✓ Selected team: ${selectedTeam.name}\n`);

    // Fetch projects
    console.log('Fetching projects...');
    const projects = await client.getProjects(selectedTeam.gid);

    if (projects.length === 0) {
      console.error('✗ No projects found in this team.');
      return;
    }

    const projectResponse = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project:',
      choices: projects.map((project) => ({
        title: project.name,
        value: project,
      })),
    });

    if (!projectResponse.project) {
      console.log('Cancelled.');
      return;
    }

    const selectedProject = projectResponse.project;
    console.log(`\n✓ Selected project: ${selectedProject.name}`);

    // Update config
    config.asana!.workspaceId = selectedWorkspace.gid;
    config.asana!.workspaceName = selectedWorkspace.name;
    config.asana!.teamId = selectedTeam.gid;
    config.asana!.teamName = selectedTeam.name;
    config.asana!.projectId = selectedProject.gid;
    config.asana!.projectName = selectedProject.name;

    configManager.save(config);
    console.log('\n✓ Configuration updated successfully');
  }

  private async switchTeamCmd(): Promise<void> {
    const { manager: configManager, config } = this.getConfigOrExit();

    console.log('\nSwitching team...\n');

    const client = new AsanaClient(config.asana!.accessToken);

    // Fetch teams
    console.log('Fetching teams...');
    const teams = await client.getTeams(config.asana!.workspaceId);

    if (teams.length === 0) {
      console.error('✗ No teams found in this workspace.');
      return;
    }

    const teamResponse = await prompts({
      type: 'select',
      name: 'team',
      message: 'Select a team:',
      choices: teams.map((team) => ({
        title: team.name,
        value: team,
      })),
    });

    if (!teamResponse.team) {
      console.log('Cancelled.');
      return;
    }

    const selectedTeam = teamResponse.team;
    console.log(`\n✓ Selected team: ${selectedTeam.name}\n`);

    // Fetch projects
    console.log('Fetching projects...');
    const projects = await client.getProjects(selectedTeam.gid);

    if (projects.length === 0) {
      console.error('✗ No projects found in this team.');
      return;
    }

    const projectResponse = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project:',
      choices: projects.map((project) => ({
        title: project.name,
        value: project,
      })),
    });

    if (!projectResponse.project) {
      console.log('Cancelled.');
      return;
    }

    const selectedProject = projectResponse.project;
    console.log(`\n✓ Selected project: ${selectedProject.name}`);

    // Update config
    config.asana!.teamId = selectedTeam.gid;
    config.asana!.teamName = selectedTeam.name;
    config.asana!.projectId = selectedProject.gid;
    config.asana!.projectName = selectedProject.name;

    configManager.save(config);
    console.log('\n✓ Configuration updated successfully');
  }

  private async switchProjectCmd(): Promise<void> {
    const { manager: configManager, config } = this.getConfigOrExit();

    console.log('\nSwitching project...\n');

    const client = new AsanaClient(config.asana!.accessToken);

    // Fetch projects
    console.log('Fetching projects...');
    const projects = await client.getProjects(config.asana!.teamId);

    if (projects.length === 0) {
      console.error('✗ No projects found in this team.');
      return;
    }

    const projectResponse = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project:',
      choices: projects.map((project) => ({
        title: project.name,
        value: project,
      })),
    });

    if (!projectResponse.project) {
      console.log('Cancelled.');
      return;
    }

    const selectedProject = projectResponse.project;
    console.log(`\n✓ Selected project: ${selectedProject.name}`);

    // Update config
    config.asana!.projectId = selectedProject.gid;
    config.asana!.projectName = selectedProject.name;

    configManager.save(config);
    console.log('\n✓ Configuration updated successfully');
  }

  private async initCmd(): Promise<void> {
    const configManager = new ConfigManager();

    // Check if already initialized
    if (configManager.exists()) {
      const response = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration already exists. Do you want to overwrite it?',
        initial: false,
      });

      if (!response.overwrite) {
        console.log('Initialization cancelled.');
        return;
      }
    }

    console.log('Initializing task management environment...\n');

    // Prompt for backend selection
    const backendResponse = await prompts({
      type: 'select',
      name: 'backend',
      message: 'Choose your task management backend:',
      choices: [
        { title: 'Local', value: 'local', description: 'Store tasks locally on your machine' },
        { title: 'Asana', value: 'asana', description: 'Integrate with Asana for task management' },
      ],
      initial: 0,
    });

    if (!backendResponse.backend) {
      console.log('Initialization cancelled.');
      return;
    }

    const backend = backendResponse.backend as BackendType;
    const config: MinionConfig = { backend };

    // If Asana is selected, configure it
    if (backend === 'asana') {
      const asanaConfig = await this.setupAsana();
      if (!asanaConfig) {
        console.log('Initialization cancelled.');
        return;
      }
      config.asana = asanaConfig;
    }

    // Save configuration
    try {
      configManager.save(config);
      console.log(`\n✓ Configuration saved to ${configManager.getConfigDir()}`);
      console.log(`✓ Backend set to: ${backend}`);
      if (backend === 'asana' && config.asana) {
        console.log(`✓ Workspace: ${config.asana.workspaceName}`);
        console.log(`✓ Team: ${config.asana.teamName}`);
        console.log(`✓ Project: ${config.asana.projectName}`);
      }
      console.log('\n✓ Environment initialized successfully');
    } catch (error) {
      console.error(`\n✗ Failed to save configuration: ${error}`);
      process.exit(1);
    }
  }

  private async setupAsana(): Promise<AsanaConfig | null> {
    console.log('\n--- Asana Configuration ---\n');

    // Prompt for access token
    const tokenResponse = await prompts({
      type: 'password',
      name: 'accessToken',
      message: 'Enter your Asana personal access token:',
      validate: (value) => value.length > 0 || 'Access token is required',
    });

    if (!tokenResponse.accessToken) {
      return null;
    }

    const accessToken = tokenResponse.accessToken;

    // Validate token
    console.log('\nValidating access token...');
    const client = new AsanaClient(accessToken);
    const isValid = await client.validateToken();

    if (!isValid) {
      console.error('✗ Invalid access token. Please check your token and try again.');
      return null;
    }

    console.log('✓ Access token validated\n');

    // Fetch and select workspace
    console.log('Fetching workspaces...');
    const workspaces = await client.getWorkspaces();

    if (workspaces.length === 0) {
      console.error('✗ No workspaces found for this account.');
      return null;
    }

    const workspaceResponse = await prompts({
      type: 'select',
      name: 'workspace',
      message: 'Select a workspace:',
      choices: workspaces.map((ws) => ({
        title: ws.name,
        value: ws,
      })),
    });

    if (!workspaceResponse.workspace) {
      return null;
    }

    const selectedWorkspace = workspaceResponse.workspace;
    console.log(`\n✓ Selected workspace: ${selectedWorkspace.name}\n`);

    // Fetch and select team
    console.log('Fetching teams...');
    const teams = await client.getTeams(selectedWorkspace.gid);

    const teamChoices = [
      ...teams.map((team) => ({
        title: team.name,
        value: team,
      })),
      {
        title: '+ Create new team',
        value: { gid: 'CREATE_NEW', name: 'CREATE_NEW' },
      },
    ];

    const teamResponse = await prompts({
      type: 'select',
      name: 'team',
      message: 'Select a team:',
      choices: teamChoices,
    });

    if (!teamResponse.team) {
      return null;
    }

    const selectedTeam = teamResponse.team;

    if (selectedTeam.gid === 'CREATE_NEW') {
      console.log('\n⚠ "Create new team" feature is not yet implemented.');
      return null;
    }

    console.log(`\n✓ Selected team: ${selectedTeam.name}\n`);

    // Fetch and select project
    console.log('Fetching projects...');
    const projects = await client.getProjects(selectedTeam.gid);

    if (projects.length === 0) {
      console.error('✗ No projects found in this team.');
      return null;
    }

    const projectResponse = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project:',
      choices: projects.map((project) => ({
        title: project.name,
        value: project,
      })),
    });

    if (!projectResponse.project) {
      return null;
    }

    const selectedProject = projectResponse.project;
    console.log(`\n✓ Selected project: ${selectedProject.name}`);

    return {
      accessToken,
      workspaceId: selectedWorkspace.gid,
      workspaceName: selectedWorkspace.name,
      teamId: selectedTeam.gid,
      teamName: selectedTeam.name,
      projectId: selectedProject.gid,
      projectName: selectedProject.name,
    };
  }
}
