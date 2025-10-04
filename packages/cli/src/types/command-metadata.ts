/**
 * Metadata structure for CLI commands.
 *
 * This provides a machine-readable representation of command structure,
 * arguments, options, and documentation that can be output as JSON for
 * agents or rendered as human-readable help text.
 */

export interface CommandMetadata {
  /** Command name */
  name: string;

  /** Short alias for the command */
  alias?: string;

  /** Brief one-line description */
  summary: string;

  /** Detailed description with context and usage */
  description?: string;

  /** List of arguments */
  arguments?: ArgumentMetadata[];

  /** List of options/flags */
  options?: OptionMetadata[];

  /** List of subcommands */
  subcommands?: CommandMetadata[];

  /** Usage examples */
  examples?: ExampleMetadata[];

  /** Additional tips or notes */
  notes?: string[];

  /** Related commands */
  relatedCommands?: string[];
}

export interface ArgumentMetadata {
  /** Argument name */
  name: string;

  /** Whether the argument is required */
  required: boolean;

  /** Argument type */
  type: 'string' | 'number' | 'boolean';

  /** Description of the argument */
  description: string;

  /** Valid values (for enum-like arguments) */
  validValues?: string[];

  /** Default value */
  defaultValue?: string;
}

export interface OptionMetadata {
  /** Short flag (e.g., "-f") */
  short?: string;

  /** Long flag (e.g., "--file") */
  long: string;

  /** Description of the option */
  description: string;

  /** Whether the option takes a value */
  takesValue: boolean;

  /** Value type if takesValue is true */
  valueType?: 'string' | 'number' | 'boolean';

  /** Value name for help display (e.g., "<path>") */
  valueName?: string;

  /** Default value */
  defaultValue?: string;

  /** Valid values (for enum-like options) */
  validValues?: string[];

  /** Whether this option is required */
  required?: boolean;
}

export interface ExampleMetadata {
  /** Description of what this example does */
  description: string;

  /** The command to run */
  command: string;

  /** Expected output or result description */
  output?: string;
}

/**
 * Renders CommandMetadata as human-readable help text.
 */
export function renderHelpText(metadata: CommandMetadata): string {
  let help = '';

  // Command header
  help += `${metadata.name}`;
  if (metadata.alias) {
    help += ` (alias: ${metadata.alias})`;
  }
  help += '\n';
  help += '='.repeat(metadata.name.length + (metadata.alias ? ` (alias: ${metadata.alias})`.length : 0)) + '\n\n';

  // Summary
  help += `${metadata.summary}\n\n`;

  // Description
  if (metadata.description) {
    help += `${metadata.description}\n\n`;
  }

  // Usage
  help += 'USAGE\n-----\n';
  let usage = `dm ${metadata.name}`;

  if (metadata.arguments && metadata.arguments.length > 0) {
    metadata.arguments.forEach(arg => {
      const argStr = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
      usage += ` ${argStr}`;
    });
  }

  if (metadata.options && metadata.options.length > 0) {
    usage += ' [options]';
  }

  if (metadata.subcommands && metadata.subcommands.length > 0) {
    usage += ' <command>';
  }

  help += `  ${usage}\n\n`;

  // Arguments
  if (metadata.arguments && metadata.arguments.length > 0) {
    help += 'ARGUMENTS\n---------\n';
    metadata.arguments.forEach(arg => {
      const required = arg.required ? '(required)' : '(optional)';
      help += `  ${arg.name} ${required}\n`;
      help += `    ${arg.description}\n`;
      if (arg.validValues) {
        help += `    Valid values: ${arg.validValues.join(', ')}\n`;
      }
      if (arg.defaultValue) {
        help += `    Default: ${arg.defaultValue}\n`;
      }
      help += '\n';
    });
  }

  // Options
  if (metadata.options && metadata.options.length > 0) {
    help += 'OPTIONS\n-------\n';
    metadata.options.forEach(opt => {
      let optStr = '  ';
      if (opt.short) {
        optStr += `${opt.short}, `;
      }
      optStr += opt.long;
      if (opt.takesValue && opt.valueName) {
        optStr += ` ${opt.valueName}`;
      }
      help += `${optStr}\n`;
      help += `    ${opt.description}\n`;
      if (opt.validValues) {
        help += `    Valid values: ${opt.validValues.join(', ')}\n`;
      }
      if (opt.defaultValue) {
        help += `    Default: ${opt.defaultValue}\n`;
      }
      help += '\n';
    });
  }

  // Subcommands
  if (metadata.subcommands && metadata.subcommands.length > 0) {
    help += 'COMMANDS\n--------\n';
    metadata.subcommands.forEach(sub => {
      help += `  ${sub.name}`;
      if (sub.alias) {
        help += ` (${sub.alias})`;
      }
      help += '\n';
      help += `    ${sub.summary}\n\n`;
    });
  }

  // Examples
  if (metadata.examples && metadata.examples.length > 0) {
    help += 'EXAMPLES\n--------\n';
    metadata.examples.forEach((ex, i) => {
      help += `  ${i + 1}. ${ex.description}\n`;
      help += `     $ ${ex.command}\n`;
      if (ex.output) {
        help += `     Output: ${ex.output}\n`;
      }
      help += '\n';
    });
  }

  // Notes
  if (metadata.notes && metadata.notes.length > 0) {
    help += 'NOTES\n-----\n';
    metadata.notes.forEach(note => {
      help += `  • ${note}\n`;
    });
    help += '\n';
  }

  // Related commands
  if (metadata.relatedCommands && metadata.relatedCommands.length > 0) {
    help += 'SEE ALSO\n--------\n';
    help += `  ${metadata.relatedCommands.join(', ')}\n\n`;
  }

  return help;
}

/**
 * Renders CommandMetadata as JSON.
 */
export function renderHelpJson(metadata: CommandMetadata): string {
  return JSON.stringify(metadata, null, 2);
}
