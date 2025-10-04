import { Command } from 'commander';
import { Module } from '../../types';
import { BackendProvider } from '../../backend-provider';
import { Backends } from '@digital-minion/lib';
import { OutputFormatter } from '../../output';
import { CommandMetadata, renderHelpJson, renderHelpText } from '../../types/command-metadata';

/**
 * Module for section management within projects.
 *
 * Provides commands for creating sections, listing available sections, and
 * moving tasks between sections. Sections provide high-level organization
 * for grouping related tasks (e.g., workflow stages, sprints, priorities).
 */
export class SectionModule implements Module {
  name = 'section';
  description = 'Manage sections for organizing tasks within projects';

  metadata: CommandMetadata = {
    name: 'section',
    alias: 'sc',
    summary: 'Manage sections for organizing tasks within projects',
    description: `Sections are containers within a project for grouping related tasks. They're displayed as 📂 icons in task lists and provide high-level organization.`,
    subcommands: [
      {
        name: 'list',
        alias: 'ls',
        summary: 'List all sections in the project',
        description: 'Shows all sections available in the current project. Use section GIDs to move tasks between sections.',
        examples: [
          {
            description: 'List all sections',
            command: 'dm section list'
          },
          {
            description: 'List sections and parse as JSON',
            command: 'dm -o json section list | jq \'.sections[]\''
          }
        ],
        notes: [
          'Section GID is used for moving tasks',
          'Sections provide high-level organization'
        ]
      },
      {
        name: 'create',
        summary: 'Create a new section in the project',
        description: 'Creates a new section for organizing tasks. Use descriptive names that indicate the purpose or stage of work.',
        arguments: [
          {
            name: 'name',
            required: true,
            type: 'string',
            description: 'Section name (e.g., "In Progress", "Backlog", "Sprint 1")'
          }
        ],
        examples: [
          {
            description: 'Create a section for in-progress work',
            command: 'dm section create "In Progress"'
          },
          {
            description: 'Create a section for review stage',
            command: 'dm section create "Ready for Review"'
          },
          {
            description: 'Create a section for blocked tasks',
            command: 'dm section create "Blocked"'
          }
        ]
      },
      {
        name: 'move',
        summary: 'Move a task to a different section',
        description: 'Changes which section a task belongs to. Useful for workflow management (e.g., moving from "To Do" to "In Progress").',
        arguments: [
          {
            name: 'taskId',
            required: true,
            type: 'string',
            description: 'The task GID to move'
          },
          {
            name: 'sectionId',
            required: true,
            type: 'string',
            description: 'The target section GID (from "dm section list")'
          }
        ],
        examples: [
          {
            description: 'Move a task to a section',
            command: 'dm section move 1234567890 9876543210'
          },
          {
            description: 'Move task to "In Progress" section',
            command: 'SECTION=$(dm -o json section list | jq -r \'.sections[] | select(.name=="In Progress") | .gid\')\ndm section move 1234567890 $SECTION'
          }
        ]
      }
    ],
    notes: [
      'Workflow stages: "To Do", "In Progress", "In Review", "Done"',
      'Sprint planning: "Backlog", "Sprint 1", "Sprint 2"',
      'Priority groups: "High Priority", "Medium Priority", "Low Priority"',
      'Project phases: "Design", "Implementation", "Testing", "Deployment"',
      'Sections are displayed as 📂 icons in task lists',
      'Use descriptive names that indicate purpose or stage'
    ]
  };

  register(program: Command): void {
    const sectionCmd = program
      .command('section')
      .alias('sc')
      .description(`Manage sections for organizing tasks within projects

Sections are containers within a project for grouping related tasks. They're
displayed as 📂 icons in task lists and provide high-level organization.

Common section patterns:
  - Workflow stages: "To Do", "In Progress", "In Review", "Done"
  - Sprint planning: "Backlog", "Sprint 1", "Sprint 2"
  - Priority groups: "High Priority", "Medium Priority", "Low Priority"
  - Project phases: "Design", "Implementation", "Testing", "Deployment"

Sections are visible in task output:
  tasks list -i    # Shows "📂 Section Name" for each task`);

    // Add metadata help support
    sectionCmd.option('--help-json', 'Output command help as JSON');

    // Override help to support JSON output
    const originalHelp = sectionCmd.helpInformation.bind(sectionCmd);
    sectionCmd.helpInformation = () => {
      const opts = sectionCmd.opts();
      if (opts.helpJson) {
        return renderHelpJson(this.metadata);
      }
      return originalHelp();
    };

    sectionCmd
      .command('list')
      .alias('ls')
      .description(`List all sections in the project

Shows all sections available in the current project. Use section GIDs to
move tasks between sections.

Example:
  tasks section list
  tasks -o json section list | jq '.sections[]'

Output includes:
  - Section GID (for moving tasks)
  - Section name`)
      .action(async () => {
        await this.listSectionsCmd();
      });

    sectionCmd
      .command('create <name>')
      .description(`Create a new section in the project

Creates a new section for organizing tasks. Use descriptive names that
indicate the purpose or stage of work.

Arguments:
  name - Section name (e.g., "In Progress", "Backlog", "Sprint 1")

Examples:
  tasks section create "In Progress"
  tasks section create "Ready for Review"
  tasks section create "Blocked"

After creation, move tasks to the section with:
  tasks section move <taskId> <sectionId>`)
      .action(async (name) => {
        await this.createSectionCmd(name);
      });

    sectionCmd
      .command('move <taskId> <sectionId>')
      .description(`Move a task to a different section

Changes which section a task belongs to. Useful for workflow management
(e.g., moving from "To Do" to "In Progress").

Arguments:
  taskId    - The task GID to move
  sectionId - The target section GID (from "tasks section list")

Examples:
  tasks section move 1234567890 9876543210

Workflow example (move task to "In Progress"):
  SECTION=$(tasks -o json section list | jq -r '.sections[] | select(.name=="In Progress") | .gid')
  tasks section move 1234567890 $SECTION

Agent workflow - move assigned tasks to "In Progress":
  for task in $(tasks -o json list --agent myname -i | jq -r '.tasks[].gid'); do
    tasks section move "$task" $IN_PROGRESS_SECTION_ID
  done`)
      .action(async (taskId, sectionId) => {
        await this.moveTaskToSectionCmd(taskId, sectionId);
      });
  }


  private async listSectionsCmd(): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getSectionBackend();
      const sections = await backend.listSections();

      if (sections.length === 0) {
        if (OutputFormatter.isJson()) {
          OutputFormatter.print({ sections: [], count: 0 });
        } else {
          console.log('No sections found.');
        }
        return;
      }

      OutputFormatter.print(
        { sections, count: sections.length },
        () => {
          console.log(`\nSections (${sections.length}):\n`);
          sections.forEach((section: Backends.Section) => {
            console.log(`  [${section.gid}] ${section.name}`);
          });
          console.log();
        }
      );
    } catch (error) {
      OutputFormatter.error(`Error listing sections: ${error}`);
    }
  }

  private async createSectionCmd(name: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getSectionBackend();
      const section = await backend.createSection(name);

      console.log(`\n✓ Section created: ${section.name} [${section.gid}]`);
      console.log();
    } catch (error) {
      console.error(`✗ Error creating section: ${error}`);
      process.exit(1);
    }
  }

  private async moveTaskToSectionCmd(taskId: string, sectionId: string): Promise<void> {
    try {
      const backend = BackendProvider.getInstance().getSectionBackend();
      await backend.moveTaskToSection(taskId, sectionId);

      console.log(`\n✓ Task moved to section`);
      console.log();
    } catch (error) {
      console.error(`✗ Error moving task to section: ${error}`);
      process.exit(1);
    }
  }
}
