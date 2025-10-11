import { Command } from 'commander';
import prompts from 'prompts';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { BackendType, MinionConfig, AsanaConfig } from '../../config/types';
import { AsanaClient } from './asana-client';
import { OutputFormatter } from '../../output';
import { CommandMetadata } from '../../types/command-metadata';
import { addMetadataHelp } from '../../utils/command-help';

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
      .description(this.metadata.summary);

    // Add progressive help support
    addMetadataHelp(configCmd, this.metadata);

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

    // Backend management commands
    const backendCmd = configCmd
      .command('backend')
      .description('Manage multiple backends');

    backendCmd
      .command('list')
      .description('List all configured backends')
      .action(async () => {
        await this.listBackendsCmd();
      });

    backendCmd
      .command('add <name>')
      .description('Add a new backend configuration')
      .action(async (name: string) => {
        await this.addBackendCmd(name);
      });

    backendCmd
      .command('remove <name>')
      .description('Remove a backend configuration')
      .action(async (name: string) => {
        await this.removeBackendCmd(name);
      });

    backendCmd
      .command('set-default <name>')
      .description('Set the default backend')
      .action(async (name: string) => {
        await this.setDefaultBackendCmd(name);
      });
  }

  private getConfigOrExit(): { manager: ConfigManager; config: MinionConfig; backendName: string } {
    const configManager = new ConfigManager();
    const config = configManager.load();

    if (!config) {
      console.error('✗ No configuration found. Please run "dm init" first.');
      process.exit(1);
    }

    const backendName = config.defaultBackend;
    const backendConfig = config.backends[backendName];

    if (!backendConfig || backendConfig.type !== 'asana' || !backendConfig.asana) {
      console.error('✗ Only Asana backend is supported for context switching.');
      console.error(`✗ Current backend '${backendName}' is not an Asana backend.`);
      process.exit(1);
    }

    return { manager: configManager, config, backendName };
  }

  private async showConfigCmd(): Promise<void> {
    const { config, backendName } = this.getConfigOrExit();
    const backendConfig = config.backends[backendName]!;

    if (OutputFormatter.isJson()) {
      OutputFormatter.print({
        defaultBackend: backendName,
        backend: backendConfig.type,
        workspace: {
          id: backendConfig.asana!.workspaceId,
          name: backendConfig.asana!.workspaceName
        },
        team: {
          id: backendConfig.asana!.teamId,
          name: backendConfig.asana!.teamName
        },
        project: {
          id: backendConfig.asana!.projectId,
          name: backendConfig.asana!.projectName
        }
      });
    } else {
      console.log('\nCurrent Configuration:');
      console.log('=====================\n');
      console.log(`Default Backend: ${backendName}`);
      console.log(`Backend Type:    ${backendConfig.type}`);
      console.log(`Workspace:       ${backendConfig.asana!.workspaceName} [${backendConfig.asana!.workspaceId}]`);
      console.log(`Team:            ${backendConfig.asana!.teamName} [${backendConfig.asana!.teamId}]`);
      console.log(`Project:         ${backendConfig.asana!.projectName} [${backendConfig.asana!.projectId}]`);
      console.log();
    }
  }

  private async switchWorkspaceCmd(): Promise<void> {
    const { manager: configManager, config, backendName } = this.getConfigOrExit();
    const backendConfig = config.backends[backendName]!;

    console.log('\nSwitching workspace...\n');

    const client = new AsanaClient(backendConfig.asana!.accessToken);

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
      console.log('Cancelled.');
      return;
    }

    let selectedTeam = teamResponse.team;

    if (selectedTeam.gid === 'CREATE_NEW') {
      const newTeamResponse = await prompts({
        type: 'text',
        name: 'teamName',
        message: 'Enter name for the new team:',
        validate: (value) => value.trim().length > 0 || 'Team name is required',
      });

      if (!newTeamResponse.teamName) {
        console.log('Cancelled.');
        return;
      }

      console.log('\nCreating new team...');
      selectedTeam = await client.createTeam(selectedWorkspace.gid, newTeamResponse.teamName.trim());
      console.log(`✓ Team created: ${selectedTeam.name}`);
    }

    console.log(`\n✓ Selected team: ${selectedTeam.name}\n`);

    // Fetch projects
    console.log('Fetching projects...');
    const projects = await client.getProjects(selectedTeam.gid);

    const projectChoices = [
      ...projects.map((project) => ({
        title: project.name,
        value: project,
      })),
      {
        title: '+ Create new project',
        value: { gid: 'CREATE_NEW', name: 'CREATE_NEW' },
      },
    ];

    const projectResponse = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project:',
      choices: projectChoices,
    });

    if (!projectResponse.project) {
      console.log('Cancelled.');
      return;
    }

    let selectedProject = projectResponse.project;

    if (selectedProject.gid === 'CREATE_NEW') {
      const newProjectResponse = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Enter name for the new project:',
        validate: (value) => value.trim().length > 0 || 'Project name is required',
      });

      if (!newProjectResponse.projectName) {
        console.log('Cancelled.');
        return;
      }

      console.log('\nCreating new project...');
      selectedProject = await client.createProject(selectedWorkspace.gid, newProjectResponse.projectName.trim(), selectedTeam.gid);
      console.log(`✓ Project created: ${selectedProject.name}`);
    }

    console.log(`\n✓ Selected project: ${selectedProject.name}`);

    // Update config
    backendConfig.asana!.workspaceId = selectedWorkspace.gid;
    backendConfig.asana!.workspaceName = selectedWorkspace.name;
    backendConfig.asana!.teamId = selectedTeam.gid;
    backendConfig.asana!.teamName = selectedTeam.name;
    backendConfig.asana!.projectId = selectedProject.gid;
    backendConfig.asana!.projectName = selectedProject.name;

    configManager.save(config);
    console.log('\n✓ Configuration updated successfully');
  }

  private async switchTeamCmd(): Promise<void> {
    const { manager: configManager, config, backendName } = this.getConfigOrExit();
    const backendConfig = config.backends[backendName]!;

    console.log('\nSwitching team...\n');

    const client = new AsanaClient(backendConfig.asana!.accessToken);

    // Fetch teams
    console.log('Fetching teams...');
    const teams = await client.getTeams(backendConfig.asana!.workspaceId);

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
      console.log('Cancelled.');
      return;
    }

    let selectedTeam = teamResponse.team;

    if (selectedTeam.gid === 'CREATE_NEW') {
      const newTeamResponse = await prompts({
        type: 'text',
        name: 'teamName',
        message: 'Enter name for the new team:',
        validate: (value) => value.trim().length > 0 || 'Team name is required',
      });

      if (!newTeamResponse.teamName) {
        console.log('Cancelled.');
        return;
      }

      console.log('\nCreating new team...');
      selectedTeam = await client.createTeam(backendConfig.asana!.workspaceId, newTeamResponse.teamName.trim());
      console.log(`✓ Team created: ${selectedTeam.name}`);
    }

    console.log(`\n✓ Selected team: ${selectedTeam.name}\n`);

    // Fetch projects
    console.log('Fetching projects...');
    const projects = await client.getProjects(selectedTeam.gid);

    const projectChoices = [
      ...projects.map((project) => ({
        title: project.name,
        value: project,
      })),
      {
        title: '+ Create new project',
        value: { gid: 'CREATE_NEW', name: 'CREATE_NEW' },
      },
    ];

    const projectResponse = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project:',
      choices: projectChoices,
    });

    if (!projectResponse.project) {
      console.log('Cancelled.');
      return;
    }

    let selectedProject = projectResponse.project;

    if (selectedProject.gid === 'CREATE_NEW') {
      const newProjectResponse = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Enter name for the new project:',
        validate: (value) => value.trim().length > 0 || 'Project name is required',
      });

      if (!newProjectResponse.projectName) {
        console.log('Cancelled.');
        return;
      }

      console.log('\nCreating new project...');
      selectedProject = await client.createProject(backendConfig.asana!.workspaceId, newProjectResponse.projectName.trim(), selectedTeam.gid);
      console.log(`✓ Project created: ${selectedProject.name}`);
    }

    console.log(`\n✓ Selected project: ${selectedProject.name}`);

    // Update config
    backendConfig.asana!.teamId = selectedTeam.gid;
    backendConfig.asana!.teamName = selectedTeam.name;
    backendConfig.asana!.projectId = selectedProject.gid;
    backendConfig.asana!.projectName = selectedProject.name;

    configManager.save(config);
    console.log('\n✓ Configuration updated successfully');
  }

  private async switchProjectCmd(): Promise<void> {
    const { manager: configManager, config, backendName } = this.getConfigOrExit();
    const backendConfig = config.backends[backendName]!;

    console.log('\nSwitching project...\n');

    const client = new AsanaClient(backendConfig.asana!.accessToken);

    // Fetch projects
    console.log('Fetching projects...');
    const projects = await client.getProjects(backendConfig.asana!.teamId);

    const projectChoices = [
      ...projects.map((project) => ({
        title: project.name,
        value: project,
      })),
      {
        title: '+ Create new project',
        value: { gid: 'CREATE_NEW', name: 'CREATE_NEW' },
      },
    ];

    const projectResponse = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project:',
      choices: projectChoices,
    });

    if (!projectResponse.project) {
      console.log('Cancelled.');
      return;
    }

    let selectedProject = projectResponse.project;

    if (selectedProject.gid === 'CREATE_NEW') {
      const newProjectResponse = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Enter name for the new project:',
        validate: (value) => value.trim().length > 0 || 'Project name is required',
      });

      if (!newProjectResponse.projectName) {
        console.log('Cancelled.');
        return;
      }

      console.log('\nCreating new project...');
      selectedProject = await client.createProject(backendConfig.asana!.workspaceId, newProjectResponse.projectName.trim(), backendConfig.asana!.teamId);
      console.log(`✓ Project created: ${selectedProject.name}`);
    }

    console.log(`\n✓ Selected project: ${selectedProject.name}`);

    // Update config
    backendConfig.asana!.projectId = selectedProject.gid;
    backendConfig.asana!.projectName = selectedProject.name;

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

    // Create backend configuration
    const backendConfig: any = {
      type: backend,
      description: `Default ${backend} backend`,
    };

    // Configure based on type
    if (backend === 'asana') {
      const asanaConfig = await this.setupAsana();
      if (!asanaConfig) {
        console.log('Initialization cancelled.');
        return;
      }
      backendConfig.asana = asanaConfig;
    } else if (backend === 'local') {
      const localConfig = await this.setupLocal();
      if (!localConfig) {
        console.log('Initialization cancelled.');
        return;
      }
      backendConfig.local = localConfig;
    }

    // Create new multi-backend config
    const config: MinionConfig = {
      defaultBackend: 'default',
      backends: {
        default: backendConfig,
      },
    };

    // Save configuration
    try {
      configManager.save(config);
      console.log(`\n✓ Configuration saved to ${configManager.getConfigDir()}`);
      console.log(`✓ Backend set to: ${backend}`);
      if (backend === 'asana' && backendConfig.asana) {
        console.log(`✓ Workspace: ${backendConfig.asana.workspaceName}`);
        console.log(`✓ Team: ${backendConfig.asana.teamName}`);
        console.log(`✓ Project: ${backendConfig.asana.projectName}`);
      } else if (backend === 'local' && backendConfig.local) {
        console.log(`✓ Base Path: ${backendConfig.local.basePath}`);
        console.log(`✓ Project ID: ${backendConfig.local.projectId}`);
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

    let selectedTeam = teamResponse.team;

    if (selectedTeam.gid === 'CREATE_NEW') {
      const newTeamResponse = await prompts({
        type: 'text',
        name: 'teamName',
        message: 'Enter name for the new team:',
        validate: (value) => value.trim().length > 0 || 'Team name is required',
      });

      if (!newTeamResponse.teamName) {
        return null;
      }

      console.log('\nCreating new team...');
      selectedTeam = await client.createTeam(selectedWorkspace.gid, newTeamResponse.teamName.trim());
      console.log(`✓ Team created: ${selectedTeam.name}`);
    }

    console.log(`\n✓ Selected team: ${selectedTeam.name}\n`);

    // Fetch and select project
    console.log('Fetching projects...');
    const projects = await client.getProjects(selectedTeam.gid);

    const projectChoices = [
      ...projects.map((project) => ({
        title: project.name,
        value: project,
      })),
      {
        title: '+ Create new project',
        value: { gid: 'CREATE_NEW', name: 'CREATE_NEW' },
      },
    ];

    const projectResponse = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project:',
      choices: projectChoices,
    });

    if (!projectResponse.project) {
      return null;
    }

    let selectedProject = projectResponse.project;

    if (selectedProject.gid === 'CREATE_NEW') {
      const newProjectResponse = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Enter name for the new project:',
        validate: (value) => value.trim().length > 0 || 'Project name is required',
      });

      if (!newProjectResponse.projectName) {
        return null;
      }

      console.log('\nCreating new project...');
      selectedProject = await client.createProject(selectedWorkspace.gid, newProjectResponse.projectName.trim(), selectedTeam.gid);
      console.log(`✓ Project created: ${selectedProject.name}`);
    }

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

  private async listBackendsCmd(): Promise<void> {
    const configManager = new ConfigManager();
    const backends = configManager.listBackends();

    if (backends.length === 0) {
      console.log('✗ No backends configured. Please run "dm config init" first.');
      return;
    }

    const defaultBackend = configManager.getDefaultBackendName();

    if (OutputFormatter.isJson()) {
      OutputFormatter.print({
        defaultBackend,
        backends: Object.fromEntries(backends.map(([name, config]) => [
          name,
          {
            type: config.type,
            description: config.description,
            isDefault: name === defaultBackend
          }
        ]))
      });
    } else {
      console.log('\nConfigured Backends:');
      console.log('===================\n');

      for (const [name, config] of backends) {
        const isDefault = name === defaultBackend;
        const defaultMarker = isDefault ? ' (default)' : '';
        console.log(`${name}${defaultMarker}`);
        console.log(`  Type: ${config.type}`);
        if (config.description) {
          console.log(`  Description: ${config.description}`);
        }
        if (config.type === 'asana' && config.asana) {
          console.log(`  Workspace: ${config.asana.workspaceName}`);
          console.log(`  Team: ${config.asana.teamName}`);
          console.log(`  Project: ${config.asana.projectName}`);
        } else if (config.type === 'local' && config.local) {
          console.log(`  Base Path: ${config.local.basePath}`);
          console.log(`  Team: ${config.local.teamName}`);
          console.log(`  Project: ${config.local.projectName}`);
          console.log(`  Project ID: ${config.local.projectId}`);
        }
        console.log();
      }
    }
  }

  private async addBackendCmd(name: string): Promise<void> {
    const configManager = new ConfigManager();

    // Check if backend already exists
    const existing = configManager.getBackend(name);
    if (existing) {
      const response = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Backend '${name}' already exists. Do you want to overwrite it?`,
        initial: false,
      });

      if (!response.overwrite) {
        console.log('Operation cancelled.');
        return;
      }
    }

    console.log(`\nAdding backend '${name}'...\n`);

    // Prompt for backend type
    const typeResponse = await prompts({
      type: 'select',
      name: 'type',
      message: 'Choose backend type:',
      choices: [
        { title: 'Local', value: 'local', description: 'Store tasks locally on your machine' },
        { title: 'Asana', value: 'asana', description: 'Integrate with Asana for task management' },
      ],
      initial: 0,
    });

    if (!typeResponse.type) {
      console.log('Operation cancelled.');
      return;
    }

    const backendType = typeResponse.type as BackendType;

    // Prompt for description
    const descResponse = await prompts({
      type: 'text',
      name: 'description',
      message: 'Enter a description (optional):',
    });

    const description = descResponse.description || undefined;

    // Configure based on type
    let backendConfig: any = {
      type: backendType,
      description,
    };

    if (backendType === 'asana') {
      const asanaConfig = await this.setupAsana();
      if (!asanaConfig) {
        console.log('Operation cancelled.');
        return;
      }
      backendConfig.asana = asanaConfig;
    } else if (backendType === 'local') {
      const localConfig = await this.setupLocal();
      if (!localConfig) {
        console.log('Operation cancelled.');
        return;
      }
      backendConfig.local = localConfig;
    }

    // Ask if this should be the default
    const setAsDefault = existing ? false : true; // Auto-set as default if it's the first backend

    let makeDefault = setAsDefault;
    if (!setAsDefault) {
      const defaultResponse = await prompts({
        type: 'confirm',
        name: 'setDefault',
        message: 'Set this as the default backend?',
        initial: false,
      });

      makeDefault = defaultResponse.setDefault || false;
    }

    // Save backend
    try {
      configManager.addBackend(name, backendConfig, makeDefault);
      console.log(`\n✓ Backend '${name}' added successfully`);
      if (makeDefault) {
        console.log(`✓ Set as default backend`);
      }
    } catch (error) {
      console.error(`\n✗ Failed to add backend: ${error}`);
      process.exit(1);
    }
  }

  private async setupLocal(): Promise<{ basePath: string; teamName: string; projectName: string; projectId: string } | null> {
    console.log('\n--- Local Configuration ---\n');

    const basePathResponse = await prompts({
      type: 'text',
      name: 'basePath',
      message: 'Enter base path for local storage:',
      initial: './.minion/local',
      validate: (value) => value.trim().length > 0 || 'Base path is required',
    });

    if (!basePathResponse.basePath) {
      return null;
    }

    const teamNameResponse = await prompts({
      type: 'text',
      name: 'teamName',
      message: 'Enter team name:',
      initial: 'default-team',
      validate: (value) => value.trim().length > 0 || 'Team name is required',
    });

    if (!teamNameResponse.teamName) {
      return null;
    }

    const projectNameResponse = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'Enter project name:',
      initial: 'tasks',
      validate: (value) => value.trim().length > 0 || 'Project name is required',
    });

    if (!projectNameResponse.projectName) {
      return null;
    }

    const projectIdResponse = await prompts({
      type: 'text',
      name: 'projectId',
      message: 'Enter project ID:',
      initial: 'default',
      validate: (value) => value.trim().length > 0 || 'Project ID is required',
    });

    if (!projectIdResponse.projectId) {
      return null;
    }

    return {
      basePath: basePathResponse.basePath.trim(),
      teamName: teamNameResponse.teamName.trim(),
      projectName: projectNameResponse.projectName.trim(),
      projectId: projectIdResponse.projectId.trim(),
    };
  }

  private async removeBackendCmd(name: string): Promise<void> {
    const configManager = new ConfigManager();

    const backend = configManager.getBackend(name);
    if (!backend) {
      console.error(`✗ Backend '${name}' not found.`);
      return;
    }

    const response = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to remove backend '${name}'?`,
      initial: false,
    });

    if (!response.confirm) {
      console.log('Operation cancelled.');
      return;
    }

    try {
      configManager.removeBackend(name);
      console.log(`✓ Backend '${name}' removed successfully`);
    } catch (error) {
      console.error(`✗ Failed to remove backend: ${error}`);
    }
  }

  private async setDefaultBackendCmd(name: string): Promise<void> {
    const configManager = new ConfigManager();

    const backend = configManager.getBackend(name);
    if (!backend) {
      console.error(`✗ Backend '${name}' not found.`);
      return;
    }

    try {
      configManager.setDefaultBackend(name);
      console.log(`✓ Backend '${name}' set as default`);
    } catch (error) {
      console.error(`✗ Failed to set default backend: ${error}`);
    }
  }
}
