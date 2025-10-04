import { Command } from 'commander';
import { ModuleRegistry } from './registry';
import { ConfigModule } from './modules/config';
import { ListModule } from './modules/list';
import { TaskModule } from './modules/task';
import { TagModule } from './modules/tag';
import { SectionModule } from './modules/section';
import { SubtaskModule } from './modules/subtask';
import { CommentModule } from './modules/comment';
import { ExamplesModule } from './modules/examples';
import { ExportModule } from './modules/export';
import { AttachmentModule } from './modules/attachment';
import { DependencyModule } from './modules/dependency';
import { WorkflowModule } from './modules/workflow';
import { StatusModule } from './modules/status';
import { ProjectModule } from './modules/project';
import { UserModule } from './modules/user';
import { BatchModule } from './modules/batch';
import { OutputFormatter } from './output';

/**
 * Main entry point for the task management CLI application.
 *
 * Initializes the CLI program, registers all modules, configures output formatting,
 * and processes command-line arguments. Supports both human-friendly text output
 * and machine-readable JSON output for automation.
 *
 * Returns:
 *   Promise that resolves when the CLI has completed execution.
 *
 * Example:
 *   Called automatically when running as main module:
 *   $ tasks list --agent myname -i
 *   $ tasks -o json task add "New task"
 */
export async function main(): Promise<void> {
  // Extract output format early from command line arguments
  const outputIndex = process.argv.findIndex(arg => arg === '-o' || arg === '--output');
  if (outputIndex !== -1 && process.argv[outputIndex + 1]) {
    const format = process.argv[outputIndex + 1];
    if (format === 'json' || format === 'text') {
      OutputFormatter.setFormat(format);
    }
  }

  const program = new Command();
  const registry = new ModuleRegistry();

  // Configure CLI
  const modules = registry.getModules();
  const modulesHelp = `\n\nAvailable Commands:\n${modules.map(m => `  ${m.name.padEnd(15)} ${m.description}`).join('\n')}`;

  const quickStartHelp = `\n\nQuick Start for Agents:
  1. Find your work:       tasks list --agent myname -i
  2. Get task details:     tasks task get <taskId>
  3. Complete a task:      tasks task complete <taskId>
  4. Self-assign work:     tasks assign <taskId> myname

  For comprehensive examples: tasks examples agents`;

  const jsonHelp = `\n\nJSON Output (Recommended for Agents):
  All commands support JSON output with -o json flag:
    tasks -o json list --agent myname -i | jq '.tasks[]'
    tasks -o json task get <taskId> | jq '.task'

  Perfect for programmatic consumption, scripting, and automation.
  Run 'tasks examples' for detailed usage patterns.`;

  program
    .name('tasks')
    .description(`Task Management CLI for Teams and AI Agents

A modular CLI for managing tasks in Asana projects. Designed for both human
users and AI agents with comprehensive JSON output support.

Key Features:
  • Agent-friendly task assignment (no Asana accounts needed)
  • Powerful filtering and search
  • Full CRUD operations for tasks
  • Tags, sections, and subtasks for organization
  • JSON output for programmatic consumption${modulesHelp}${quickStartHelp}${jsonHelp}`)
    .version('1.0.0')
    .option('-o, --output <format>', 'Output format: text (default) or json for automation', 'text');

  // Register modules
  registry.register(new ConfigModule());
  registry.register(new ListModule());
  registry.register(new ProjectModule());
  registry.register(new TaskModule());
  registry.register(new TagModule());
  registry.register(new SectionModule());
  registry.register(new SubtaskModule());
  registry.register(new CommentModule());
  registry.register(new AttachmentModule());
  registry.register(new DependencyModule());
  registry.register(new WorkflowModule());
  registry.register(new StatusModule());
  registry.register(new UserModule());
  registry.register(new BatchModule());
  registry.register(new ExportModule());
  registry.register(new ExamplesModule());

  // Apply all modules to the program
  registry.applyModules(program);

  // Parse arguments
  await program.parseAsync(process.argv);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
