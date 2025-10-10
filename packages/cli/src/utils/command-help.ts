import { Command } from 'commander';
import { CommandMetadata, renderHelpJson } from '../types/command-metadata';
import { renderModuleHelp, shouldUseColors } from './progressive-help';
import { OutputFormatter } from '../output';

/**
 * Adds --help-json option to a command and handles metadata output.
 *
 * @param command The Commander command to enhance
 * @param metadata The command metadata
 * @returns The enhanced command
 */
export function addMetadataHelp(command: Command, metadata: CommandMetadata): Command {
  // Add --help-json option
  command.option('--help-json', 'Output command help as JSON');

  // Override the help display to check for --help-json
  const originalHelp = command.helpInformation.bind(command);

  command.helpInformation = function() {
    // Check if --help-json was passed
    const opts = this.opts();
    if (opts.helpJson) {
      return renderHelpJson(metadata);
    }

    // Check if we're in JSON output mode (no colors, use original help)
    if (OutputFormatter.getFormat() === 'json') {
      return renderHelpJson(metadata);
    }

    // If metadata exists, use our progressive help renderer
    if (metadata) {
      return renderModuleHelp(metadata, {
        useColors: shouldUseColors(),
        width: process.stdout.columns || 80,
      });
    }

    // Fall back to default Commander help
    return originalHelp();
  };

  return command;
}
