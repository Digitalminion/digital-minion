/**
 * JSON I/O Service
 *
 * Handles file I/O operations with atomic writes and backups.
 */

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { StorageWriteOptions, StorageStats } from '../storage.types';

export class JsonIOService {
  /**
   * Read JSON from file
   */
  async read<T>(path: string): Promise<T> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${path}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in file: ${path}`);
      }
      throw error;
    }
  }

  /**
   * Write JSON to file with atomic write guarantee
   */
  async write<T>(path: string, data: T, options: StorageWriteOptions = {}): Promise<void> {
    const dir = dirname(path);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Check if file exists and overwrite is false
    if (options.overwrite === false && await this.exists(path)) {
      throw new Error(`File already exists: ${path}`);
    }

    // Create backup if requested
    if (options.backup) {
      await this.backup(path);
    }

    // Serialize data
    const content = options.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    // Atomic write: write to temp file, then rename
    const tempPath = `${path}.tmp`;

    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, path);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
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
    try {
      const stats = await fs.stat(path);
      const content = await fs.readFile(path, 'utf-8');

      return {
        path,
        sizeBytes: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        itemCount: content.split('\n').filter(line => line.trim()).length
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  /**
   * Delete file
   */
  async delete(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, that's fine
        return;
      }
      throw error;
    }
  }

  /**
   * Create backup of file
   */
  async backup(path: string): Promise<string> {
    const exists = await this.exists(path);
    if (!exists) {
      throw new Error(`Cannot backup non-existent file: ${path}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${path}.backup.${timestamp}`;

    await fs.copyFile(path, backupPath);
    return backupPath;
  }

  /**
   * Update file by reading, modifying, and writing
   */
  async update<T>(path: string, updates: Partial<T>): Promise<T> {
    const existing = await this.read<T>(path);
    const updated = { ...existing, ...updates };
    await this.write(path, updated, { backup: true });
    return updated;
  }
}
