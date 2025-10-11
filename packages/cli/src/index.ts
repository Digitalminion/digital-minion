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
import { TemplateModule } from './modules/template';
import { TimeModule } from './modules/time';
import { SyncModule } from './modules/sync';
import { OutputFormatter } from './output';
import { renderMainHelp, shouldUseColors } from './utils/progressive-help';
import { BackendProvider } from './backend-provider';

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

  // Extract backend flag early from command line arguments
  const backendIndex = process.argv.findIndex(arg => arg === '-b' || arg === '--backend');
  if (backendIndex !== -1 && process.argv[backendIndex + 1]) {
    const backendName = process.argv[backendIndex + 1];
    BackendProvider.getInstance().setCurrentBackend(backendName);
  }

  const program = new Command();
  const registry = new ModuleRegistry();

  // Register modules first
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
  registry.register(new TemplateModule());
  registry.register(new TimeModule());
  registry.register(new SyncModule());
  registry.register(new ExportModule());
  registry.register(new ExamplesModule());

  // Get modules for help
  const modules = registry.getModules();

  // Configure CLI
  program
    .name('dm')
    .description('Task Management CLI for Teams and AI Agents')
    .version('1.4.1')
    .option('-o, --output <format>', 'Output format: text (default) or json for automation', 'text')
    .option('-b, --backend <name>', 'Backend to use for this command (overrides default)');

  // Override help to use our progressive help renderer
  const originalHelp = program.helpInformation.bind(program);
  program.helpInformation = function() {
    // Check if we're in JSON output mode
    if (OutputFormatter.getFormat() === 'json') {
      return originalHelp();
    }

    // Use our progressive help renderer
    return renderMainHelp(modules, {
      useColors: shouldUseColors(),
      width: process.stdout.columns || 80,
    });
  };

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
