import { Command } from 'commander';
import { CommandMetadata, renderHelpJson, renderHelpText } from '../types/command-metadata';

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

    // If metadata exists and no --help-json, use our custom renderer
    if (metadata) {
      return renderHelpText(metadata);
    }

    // Fall back to default Commander help
    return originalHelp();
  };

  return command;
}
