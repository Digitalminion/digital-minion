import { Command } from 'commander';
import prompts from 'prompts';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { BackendType, MinionConfig, AsanaConfig } from '../../config/types';
import { AsanaClient } from './asana-client';

/**
 * Module for initializing the CLI configuration.
 *
 * Provides an interactive setup wizard for configuring the task management
 * backend (Asana or local). Handles credential collection, validation, and
 * workspace/project selection.
 */
export class InitModule implements Module {
  name = 'init';
  description = 'Bootstrap your local environment for task management';

  register(program: Command): void {
    program
      .command('init')
      .description(this.description)
      .action(async () => {
        await this.execute();
      });
  }

  private async execute(): Promise<void> {
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
