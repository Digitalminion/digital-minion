import chalk from 'chalk';
import { CommandMetadata } from '../types/command-metadata';

/**
 * Progressive help renderer with visual appeal.
 *
 * Provides a hierarchical help system that only shows relevant information
 * for the current scope, with beautiful formatting for human readability.
 */

interface HelpConfig {
  /** Whether to use colors (disable for JSON mode or when piping) */
  useColors: boolean;
  /** Terminal width for formatting */
  width: number;
}

const defaultConfig: HelpConfig = {
  useColors: process.stdout.isTTY ?? true,
  width: process.stdout.columns || 80,
};

/**
 * Render the top-level help (dm help)
 */
export function renderMainHelp(modules: Array<{ name: string; description: string }>, config: HelpConfig = defaultConfig): string {
  const { useColors, width } = config;

  const c = createColorizer(useColors);
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(c.title('┌─────────────────────────────────────────────────────────────────┐'));
  lines.push(c.title('│               🤖  DIGITAL MINION TASK CLI  🤖                  │'));
  lines.push(c.title('└─────────────────────────────────────────────────────────────────┘'));
  lines.push('');

  // Quick description
  lines.push(c.section('  Task management for humans and AI agents'));
  lines.push('');

  // Agent Quick Start
  lines.push(c.heading('🎯 QUICK START (For Agents)'));
  lines.push('');
  lines.push(c.command('  dm list --agent myname -i') + c.muted('  # Find your assigned incomplete tasks'));
  lines.push(c.command('  dm task get <taskId>') + c.muted('        # Get detailed task information'));
  lines.push(c.command('  dm task complete <taskId>') + c.muted('   # Mark a task as complete'));
  lines.push('');

  // Main Commands
  lines.push(c.heading('📚 MAIN COMMAND GROUPS'));
  lines.push('');

  // Group modules by category
  const categories = {
    'Core': ['list', 'task', 'config'],
    'Organization': ['tag', 'section', 'project'],
    'Collaboration': ['comment', 'attachment', 'user'],
    'Advanced': ['batch', 'template', 'workflow', 'time'],
    'Utilities': ['examples', 'export'],
  };

  for (const [category, moduleNames] of Object.entries(categories)) {
    const categoryModules = modules.filter(m => moduleNames.includes(m.name));
    if (categoryModules.length === 0) continue;

    lines.push(c.category(`  ${category}:`));
    categoryModules.forEach(m => {
      const padding = ' '.repeat(Math.max(2, 16 - m.name.length));
      lines.push(`    ${c.commandName(m.name)}${padding}${c.description(m.description)}`);
    });
    lines.push('');
  }

  // Progressive Help Hint
  lines.push(c.heading('💡 PROGRESSIVE HELP'));
  lines.push('');
  lines.push(`  ${c.hint('Get detailed help for any command:')}`)
  lines.push('');
  lines.push(`    ${c.command('dm <command> help')}     ${c.muted('# Show help for a specific command')}`);
  lines.push(`    ${c.command('dm task help')}          ${c.muted('# Learn about task management')}`);
  lines.push(`    ${c.command('dm tag help')}           ${c.muted('# Learn about tags and labeling')}`);
  lines.push('');

  // JSON Mode
  lines.push(c.heading('🔧 OPTIONS'));
  lines.push('');
  lines.push(`  ${c.option('-o, --output <format>')}  Output format: text or json`);
  lines.push(`  ${c.option('-h, --help')}              Show help for any command`);
  lines.push(`  ${c.option('--help-json')}             Get command metadata as JSON`);
  lines.push('');

  // Footer
  lines.push(c.muted('  For comprehensive examples: ') + c.command('dm examples'));
  lines.push(c.muted('  For agent-specific workflows: ') + c.command('dm examples agents'));
  lines.push('');

  return lines.join('\n');
}

/**
 * Render module-specific help (dm task help)
 */
export function renderModuleHelp(metadata: CommandMetadata, config: HelpConfig = defaultConfig): string {
  const { useColors } = config;
  const c = createColorizer(useColors);
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(c.title(`╔════════════════════════════════════════════════════════════╗`));
  lines.push(c.title(`║  ${metadata.name.toUpperCase().padEnd(56, ' ')}  ║`));
  lines.push(c.title(`╚════════════════════════════════════════════════════════════╝`));
  lines.push('');

  // Summary
  lines.push(c.section(`  ${metadata.summary}`));
  lines.push('');

  // Description
  if (metadata.description) {
    lines.push(c.description(wrapText(metadata.description, 70, '  ')));
    lines.push('');
  }

  // Usage
  lines.push(c.heading('📖 USAGE'));
  lines.push('');
  let usage = `dm ${metadata.name}`;

  if (metadata.arguments && metadata.arguments.length > 0) {
    metadata.arguments.forEach(arg => {
      const argStr = arg.required
        ? c.requiredArg(`<${arg.name}>`)
        : c.optionalArg(`[${arg.name}]`);
      usage += ` ${argStr}`;
    });
  }

  if (metadata.options && metadata.options.length > 0) {
    usage += ` ${c.muted('[options]')}`;
  }

  if (metadata.subcommands && metadata.subcommands.length > 0) {
    usage += ` ${c.requiredArg('<command>')}`;
  }

  lines.push(`  ${usage}`);
  lines.push('');

  // Subcommands (most important for progressive help)
  if (metadata.subcommands && metadata.subcommands.length > 0) {
    lines.push(c.heading('📋 COMMANDS'));
    lines.push('');

    metadata.subcommands.forEach(sub => {
      const cmdName = sub.name + (sub.alias ? ` (${sub.alias})` : '');
      const padding = ' '.repeat(Math.max(2, 20 - cmdName.length));
      lines.push(`  ${c.commandName(cmdName)}${padding}${c.description(sub.summary)}`);
    });
    lines.push('');
    lines.push(c.hint(`  💡 Run '${c.command(`dm ${metadata.name} <command> help`)}' for command-specific help`));
    lines.push('');
  }

  // Arguments
  if (metadata.arguments && metadata.arguments.length > 0) {
    lines.push(c.heading('📝 ARGUMENTS'));
    lines.push('');

    metadata.arguments.forEach(arg => {
      const required = arg.required ? c.required('[required]') : c.optional('[optional]');
      lines.push(`  ${c.argumentName(arg.name)} ${required}`);
      lines.push(`    ${c.description(arg.description)}`);

      if (arg.validValues && arg.validValues.length > 0) {
        lines.push(`    ${c.muted('Valid values:')} ${arg.validValues.map(v => c.value(v)).join(', ')}`);
      }

      if (arg.defaultValue) {
        lines.push(`    ${c.muted('Default:')} ${c.value(arg.defaultValue)}`);
      }

      lines.push('');
    });
  }

  // Options
  if (metadata.options && metadata.options.length > 0) {
    lines.push(c.heading('⚙️  OPTIONS'));
    lines.push('');

    metadata.options.forEach(opt => {
      let optStr = '  ';
      if (opt.short) {
        optStr += c.option(opt.short) + ', ';
      }
      optStr += c.option(opt.long);

      if (opt.takesValue && opt.valueName) {
        optStr += ` ${c.optionalArg(opt.valueName)}`;
      }

      lines.push(optStr);
      lines.push(`    ${c.description(opt.description)}`);

      if (opt.validValues && opt.validValues.length > 0) {
        lines.push(`    ${c.muted('Valid values:')} ${opt.validValues.map(v => c.value(v)).join(', ')}`);
      }

      if (opt.defaultValue) {
        lines.push(`    ${c.muted('Default:')} ${c.value(opt.defaultValue)}`);
      }

      lines.push('');
    });
  }

  // Examples
  if (metadata.examples && metadata.examples.length > 0) {
    lines.push(c.heading('💻 EXAMPLES'));
    lines.push('');

    metadata.examples.forEach((ex, i) => {
      lines.push(`  ${c.exampleNum(`${i + 1}.`)} ${c.description(ex.description)}`);
      lines.push(`     ${c.prompt('$')} ${c.command(ex.command)}`);

      if (ex.output) {
        lines.push(`     ${c.muted('→')} ${c.output(ex.output)}`);
      }

      lines.push('');
    });
  }

  // Notes
  if (metadata.notes && metadata.notes.length > 0) {
    lines.push(c.heading('📌 NOTES'));
    lines.push('');

    metadata.notes.forEach(note => {
      lines.push(`  ${c.bullet('•')} ${c.description(note)}`);
    });

    lines.push('');
  }

  // Related commands
  if (metadata.relatedCommands && metadata.relatedCommands.length > 0) {
    lines.push(c.heading('🔗 SEE ALSO'));
    lines.push('');
    lines.push(`  ${metadata.relatedCommands.map(cmd => c.command(cmd)).join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Create a colorizer object that can be disabled
 */
function createColorizer(useColors: boolean) {
  if (!useColors) {
    // No-op colorizer for when colors are disabled
    return {
      title: (s: string) => s,
      heading: (s: string) => s,
      section: (s: string) => s,
      category: (s: string) => s,
      commandName: (s: string) => s,
      command: (s: string) => s,
      description: (s: string) => s,
      argumentName: (s: string) => s,
      requiredArg: (s: string) => s,
      optionalArg: (s: string) => s,
      option: (s: string) => s,
      value: (s: string) => s,
      required: (s: string) => s,
      optional: (s: string) => s,
      hint: (s: string) => s,
      muted: (s: string) => s,
      exampleNum: (s: string) => s,
      prompt: (s: string) => s,
      output: (s: string) => s,
      bullet: (s: string) => s,
      error: (s: string) => s,
      success: (s: string) => s,
    };
  }

  // Colorful versions
  return {
    title: (s: string) => chalk.bold.cyan(s),
    heading: (s: string) => chalk.bold.yellow(s),
    section: (s: string) => chalk.bold.white(s),
    category: (s: string) => chalk.bold.magenta(s),
    commandName: (s: string) => chalk.cyan(s),
    command: (s: string) => chalk.green(s),
    description: (s: string) => chalk.gray(s),
    argumentName: (s: string) => chalk.yellow(s),
    requiredArg: (s: string) => chalk.red(s),
    optionalArg: (s: string) => chalk.blue(s),
    option: (s: string) => chalk.cyan(s),
    value: (s: string) => chalk.yellow(s),
    required: (s: string) => chalk.red(s),
    optional: (s: string) => chalk.blue(s),
    hint: (s: string) => chalk.italic.cyan(s),
    muted: (s: string) => chalk.gray(s),
    exampleNum: (s: string) => chalk.bold.blue(s),
    prompt: (s: string) => chalk.green(s),
    output: (s: string) => chalk.dim(s),
    bullet: (s: string) => chalk.cyan(s),
    error: (s: string) => chalk.red(s),
    success: (s: string) => chalk.green(s),
  };
}

/**
 * Wrap text to a specific width with proper indentation
 */
function wrapText(text: string, width: number, indent: string = ''): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = indent;

  for (const word of words) {
    if (currentLine.length + word.length + 1 > width) {
      lines.push(currentLine);
      currentLine = indent + word;
    } else {
      currentLine += (currentLine.length > indent.length ? ' ' : '') + word;
    }
  }

  if (currentLine.length > indent.length) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

/**
 * Check if colors should be disabled (JSON mode, piping, etc.)
 */
export function shouldUseColors(): boolean {
  // Disable if not a TTY (being piped)
  if (!process.stdout.isTTY) {
    return false;
  }

  // Disable if NO_COLOR environment variable is set
  if (process.env.NO_COLOR) {
    return false;
  }

  // Disable if FORCE_COLOR is explicitly set to 0
  if (process.env.FORCE_COLOR === '0') {
    return false;
  }

  return true;
}
