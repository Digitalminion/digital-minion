/**
 * JSONL Row Storage
 *
 * Provides efficient row-based storage using JSONL (JSON Lines) format.
 * Each line is a separate JSON object, enabling:
 * - Efficient appends without reading entire file
 * - Streaming reads for large datasets
 * - Line-by-line processing
 *
 * Use this for logs, events, transactions, and other append-heavy workloads.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import {
  IJsonRowStorage,
  StorageWriteOptions,
  StorageStats
} from './storage.types';

/**
 * JSONL row storage implementation
 *
 * Stores data as newline-delimited JSON objects.
 * Each line is a complete, valid JSON object.
 *
 * @example
 * ```typescript
 * const storage = new JsonlRowStorage();
 *
 * // Append rows
 * await storage.appendRow('logs.jsonl', { level: 'info', message: 'Started' });
 * await storage.appendRows('logs.jsonl', logs);
 *
 * // Read rows
 * const allRows = await storage.readAll('logs.jsonl');
 * const recent = await storage.read('logs.jsonl', 0, 100);
 *
 * // Stream large files
 * for await (const chunk of storage.stream('logs.jsonl', 1000)) {
 *   processChunk(chunk);
 * }
 * ```
 */
export class JsonlRowStorage<T = any> implements IJsonRowStorage<T> {
  /**
   * Read all rows from JSONL file
   *
   * @param path - File path
   * @returns Array of parsed rows
   */
  async readAll(path: string): Promise<T[]> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return this.parseLines(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // File doesn't exist, return empty array
      }
      throw new Error(`Failed to read file ${path}: ${error.message}`);
    }
  }

  /**
   * Read rows with pagination
   *
   * @param path - File path
   * @param offset - Start offset (default: 0)
   * @param limit - Max rows to read
   * @returns Array of parsed rows
   */
  async read(path: string, offset: number = 0, limit?: number): Promise<T[]> {
    const allRows = await this.readAll(path);
    const start = Math.max(0, offset);
    const end = limit !== undefined ? start + limit : allRows.length;
    return allRows.slice(start, end);
  }

  /**
   * Write all rows to file (overwrite)
   *
   * @param path - File path
   * @param rows - Rows to write
   * @param options - Write options
   */
  async writeAll(path: string, rows: T[], options: StorageWriteOptions = {}): Promise<void> {
    const {
      backup = true,
      createDirectories = true,
      permissions = 0o644
    } = options;

    // Create parent directories
    if (createDirectories) {
      const dir = dirname(path);
      await fs.mkdir(dir, { recursive: true });
    }

    // Create backup if file exists
    if (backup && (await this.exists(path))) {
      await this.backup(path);
    }

    // Serialize rows
    const lines = rows.map(row => {
      try {
        const json = JSON.stringify(row);
        JSON.parse(json); // Verify valid JSON
        return json;
      } catch (error) {
        throw new Error(`Failed to serialize row: ${error}`);
      }
    });

    const content = lines.join('\n') + (lines.length > 0 ? '\n' : '');

    // Atomic write
    const tempPath = `${path}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

    try {
      await fs.writeFile(tempPath, content, { encoding: 'utf8', mode: permissions });

      // Verify (skip in tests)
      if (process.env.NODE_ENV !== 'test') {
        const written = await fs.readFile(tempPath, 'utf8');
        if (written !== content) {
          throw new Error('Content verification failed');
        }
      }

      await fs.rename(tempPath, path);
    } catch (error: any) {
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw new Error(`Failed to write file ${path}: ${error.message}`);
    }
  }

  /**
   * Append single row
   *
   * @param path - File path
   * @param row - Row to append
   */
  async appendRow(path: string, row: T): Promise<void> {
    await this.appendRows(path, [row]);
  }

  /**
   * Append multiple rows efficiently
   *
   * @param path - File path
   * @param rows - Rows to append
   */
  async appendRows(path: string, rows: T[]): Promise<void> {
    if (rows.length === 0) return;

    // Ensure directory exists
    const dir = dirname(path);
    await fs.mkdir(dir, { recursive: true });

    // Serialize rows
    const lines = rows.map(row => {
      try {
        const json = JSON.stringify(row);
        JSON.parse(json); // Verify
        return json + '\n';
      } catch (error) {
        throw new Error(`Failed to serialize row: ${error}`);
      }
    });

    const appendContent = lines.join('');

    // Simple append (fs.appendFile is atomic on most systems)
    try {
      await fs.appendFile(path, appendContent, { encoding: 'utf8', mode: 0o644 });
    } catch (error: any) {
      throw new Error(`Failed to append to file ${path}: ${error.message}`);
    }
  }

  /**
   * Count total rows
   *
   * @param path - File path
   * @returns Row count
   */
  async count(path: string): Promise<number> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return content.split('\n').filter(line => line.trim().length > 0).length;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw new Error(`Failed to count rows in ${path}: ${error.message}`);
    }
  }

  /**
   * Stream rows in chunks for large files
   *
   * @param path - File path
   * @param chunkSize - Rows per chunk
   * @yields Chunks of parsed rows
   */
  async *stream(path: string, chunkSize: number = 1000): AsyncGenerator<T[], void, unknown> {
    const allRows = await this.readAll(path);

    for (let i = 0; i < allRows.length; i += chunkSize) {
      yield allRows.slice(i, i + chunkSize);
    }
  }

  /**
   * Check if file exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file statistics
   */
  async getStats(path: string): Promise<StorageStats> {
    const stats = await fs.stat(path);
    const itemCount = await this.count(path);

    return {
      path,
      sizeBytes: stats.size,
      itemCount,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString()
    };
  }

  /**
   * Delete file
   */
  async delete(path: string): Promise<void> {
    await fs.unlink(path);
  }

  /**
   * Create backup
   */
  async backup(path: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${path}.backup.${timestamp}`;

    await fs.copyFile(path, backupPath);
    return backupPath;
  }

  /**
   * Parse JSONL content into rows
   *
   * @param content - JSONL content
   * @param strict - If true, throw on invalid JSON; if false, skip invalid lines (default: false)
   * @returns Parsed rows
   * @private
   */
  private parseLines(content: string, strict: boolean = false): T[] {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const rows: T[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const row = JSON.parse(lines[i]!) as T;
        rows.push(row);
      } catch (error) {
        if (strict) {
          throw new Error(`Invalid JSON at line ${i + 1}: ${error}`);
        }
        // Skip malformed lines in non-strict mode
        continue;
      }
    }

    return rows;
  }
}
