/**
 * Output format types supported by the CLI.
 */
export type OutputFormat = 'text' | 'json';

/**
 * Formatter for CLI output that supports both human-readable text and JSON formats.
 *
 * Provides a consistent interface for outputting data in either text format (with
 * formatting, colors, and symbols) or JSON format (for programmatic consumption).
 * The output format is configured globally and affects all subsequent output.
 */
export class OutputFormatter {
  private static format: OutputFormat = 'text';

  /**
   * Sets the global output format for all subsequent output.
   *
   * Args:
   *   format: The output format to use ('text' or 'json').
   */
  static setFormat(format: OutputFormat): void {
    this.format = format;
  }

  /**
   * Gets the current global output format.
   *
   * Returns:
   *   The current OutputFormat ('text' or 'json').
   */
  static getFormat(): OutputFormat {
    return this.format;
  }

  /**
   * Checks if the current output format is JSON.
   *
   * Returns:
   *   True if format is 'json', false otherwise.
   */
  static isJson(): boolean {
    return this.format === 'json';
  }

  /**
   * Prints data in the configured output format.
   *
   * In JSON mode, outputs the data as formatted JSON. In text mode, calls the
   * provided textFormatter function to handle custom text output.
   *
   * Args:
   *   data: The data object to output in JSON mode.
   *   textFormatter: Optional callback function for custom text formatting.
   */
  static print(data: any, textFormatter?: () => void): void {
    if (this.format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else if (textFormatter) {
      textFormatter();
    }
  }

  /**
   * Outputs a success message in the configured format.
   *
   * In JSON mode, outputs structured JSON with success flag, message, and optional data.
   * In text mode, displays a formatted success message with checkmark symbol.
   *
   * Args:
   *   message: Success message to display.
   *   data: Optional additional data to include in JSON output.
   */
  static success(message: string, data?: any): void {
    if (this.format === 'json') {
      console.log(JSON.stringify({ success: true, message, data }, null, 2));
    } else {
      console.log(`\n✓ ${message}`);
      console.log();
    }
  }

  /**
   * Outputs an error message and exits the process.
   *
   * In JSON mode, outputs structured JSON error to stderr. In text mode, displays
   * formatted error message with X symbol. Always exits the process after output.
   *
   * Args:
   *   message: Error message to display.
   *   exitCode: Process exit code (default: 1).
   */
  static error(message: string, exitCode: number = 1): void {
    if (this.format === 'json') {
      console.error(JSON.stringify({ success: false, error: message }, null, 2));
    } else {
      console.error(`✗ ${message}`);
    }
    process.exit(exitCode);
  }
}
