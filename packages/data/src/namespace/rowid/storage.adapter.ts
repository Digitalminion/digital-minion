/**
 * RowId Storage Adapter
 *
 * Low-level file I/O operations for reading and writing partition data files.
 * Supports both JSON and JSONL formats.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { JsonlRowStorage } from '../../storage/jsonl.storage';
import { JsonObjectStorage } from '../../storage/json.storage';

/**
 * Storage adapter for rowId partition files
 */
export class RowIdStorageAdapter {
  private jsonlStorage: JsonlRowStorage;
  private jsonStorage: JsonObjectStorage;

  constructor() {
    this.jsonlStorage = new JsonlRowStorage();
    this.jsonStorage = new JsonObjectStorage();
  }

  /**
   * Read data from partition file
   */
  async readDataFile<T>(filePath: string, format: 'json' | 'jsonl'): Promise<T[]> {
    if (format === 'jsonl') {
      return this.jsonlStorage.readAll(filePath);
    } else {
      const data = await this.jsonStorage.read(filePath);
      return Array.isArray(data) ? data : (data?.items || []);
    }
  }

  /**
   * Write data to partition file
   */
  async writeDataFile(
    filePath: string,
    data: any[],
    format: 'json' | 'jsonl'
  ): Promise<void> {
    await this.ensureDirectoryExists(dirname(filePath));

    if (format === 'jsonl') {
      await this.jsonlStorage.writeAll(filePath, data);
    } else {
      await this.jsonStorage.write(filePath, { items: data }, { pretty: true });
    }
  }

  /**
   * Ensure directory exists for file path
   */
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
}
