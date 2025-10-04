import { BatchOperation, BatchResult } from './types';

/**
 * Interface for batch operation backend implementations.
 *
 * Handles executing multiple operations in a single batch request
 * for improved performance and atomic operations.
 */
export interface IBatchBackend {
  /**
   * Executes a batch of operations in sequence.
   *
   * Args:
   *   operations: Array of batch operation objects.
   *
   * Returns:
   *   Array of batch operation results.
   */
  executeBatch(operations: BatchOperation[]): Promise<BatchResult[]>;
}
