import { Command } from 'commander';
import { Module } from '../../types';
import { ConfigManager } from '../../config/manager';
import { TaskBackend } from '../list/types';
import { AsanaTaskBackend } from '../list/asana-backend';
import { OutputFormatter } from '../../output';

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

  register(program: Command): void {
    const sectionCmd = program
      .command('section')
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

  private getBackend(): TaskBackend {
    const configManager = new ConfigManager();
    const config = configManager.load();

    if (!config) {
      console.error('✗ No configuration found. Please run "tasks init" first.');
      process.exit(1);
    }

    if (config.backend === 'asana') {
      if (!config.asana) {
        console.error('✗ Asana configuration not found. Please run "tasks init" again.');
        process.exit(1);
      }
      return new AsanaTaskBackend(config.asana);
    } else {
      console.error('✗ Local backend not yet implemented.');
      process.exit(1);
    }
  }

  private async listSectionsCmd(): Promise<void> {
    try {
      const backend = this.getBackend();
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
          sections.forEach(section => {
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
      const backend = this.getBackend();
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
      const backend = this.getBackend();
      await backend.moveTaskToSection(taskId, sectionId);

      console.log(`\n✓ Task moved to section`);
      console.log();
    } catch (error) {
      console.error(`✗ Error moving task to section: ${error}`);
      process.exit(1);
    }
  }
}
