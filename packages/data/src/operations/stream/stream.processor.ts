/**
 * Streaming Data Processor
 *
 * Provides memory-efficient streaming for large datasets with:
 * - Chunked processing
 * - Memory usage monitoring
 * - Progress tracking
 * - Early termination
 */

import { StreamOptions, StreamProgress, StreamChunk, Partition, DataSourceAdapter } from '../../layer/data.types';

/**
 * Stream Processor for memory-efficient data processing
 */
export class StreamProcessor<T = any> {
  private readonly DEFAULT_CHUNK_SIZE = 100;
  private readonly DEFAULT_MAX_MEMORY = 50 * 1024 * 1024; // 50MB

  constructor(private adapter: DataSourceAdapter<T>) {}

  /**
   * Stream data from partitions with chunking
   */
  async *stream(
    partitions: Partition<T>[],
    options: StreamOptions = {}
  ): AsyncGenerator<StreamChunk<T>> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      maxMemoryUsage = this.DEFAULT_MAX_MEMORY,
      enableEarlyTermination = true,
      progressCallback
    } = options;

    let processedPartitions = 0;
    let processedItems = 0;
    let buffer: T[] = [];
    let memoryUsage = 0;
    let chunkIndex = 0;

    const startTime = Date.now();

    for (const partition of partitions) {
      try {
        // Read partition data
        const partitionData = await this.adapter.read(partition);

        for (const item of partitionData) {
          buffer.push(item);
          processedItems++;
          memoryUsage = this.estimateMemoryUsage(buffer);

          // Report progress
          if (progressCallback) {
            const progress: StreamProgress = {
              processedItems,
              totalItems: -1, // Unknown until all partitions processed
              processedPartitions,
              totalPartitions: partitions.length,
              memoryUsage,
              estimatedTimeRemaining: this.estimateTimeRemaining(
                startTime,
                processedPartitions,
                partitions.length
              )
            };
            progressCallback(progress);
          }

          // Yield chunk if buffer is full or memory limit reached
          if (buffer.length >= chunkSize || memoryUsage > maxMemoryUsage) {
            const chunk = buffer.splice(0, chunkSize);

            yield {
              data: chunk,
              hasMore: true,
              metadata: {
                chunkIndex: chunkIndex++,
                totalChunks: -1, // Unknown
                partitionId: partition.id,
                itemCount: chunk.length
              }
            };

            memoryUsage = this.estimateMemoryUsage(buffer);
          }
        }

        processedPartitions++;

      } catch (error) {
        console.warn(`Failed to process partition ${partition.id}:`, error);

        if (!enableEarlyTermination) {
          throw error;
        }
      }
    }

    // Yield remaining items in buffer
    if (buffer.length > 0) {
      yield {
        data: buffer,
        hasMore: false,
        metadata: {
          chunkIndex: chunkIndex++,
          totalChunks: chunkIndex + 1,
          partitionId: 'final',
          itemCount: buffer.length
        }
      };
    }
  }

  /**
   * Stream with transformation
   */
  async *streamTransform<TOutput>(
    partitions: Partition<T>[],
    transformFn: (item: T) => TOutput,
    options: StreamOptions = {}
  ): AsyncGenerator<StreamChunk<TOutput>> {
    for await (const chunk of this.stream(partitions, options)) {
      const transformedData = chunk.data.map(transformFn);

      yield {
        data: transformedData,
        hasMore: chunk.hasMore,
        metadata: chunk.metadata
      };
    }
  }

  /**
   * Stream with filtering
   */
  async *streamFilter(
    partitions: Partition<T>[],
    filterFn: (item: T) => boolean,
    options: StreamOptions = {}
  ): AsyncGenerator<StreamChunk<T>> {
    for await (const chunk of this.stream(partitions, options)) {
      const filteredData = chunk.data.filter(filterFn);

      if (filteredData.length > 0) {
        yield {
          data: filteredData,
          hasMore: chunk.hasMore,
          metadata: {
            ...chunk.metadata,
            itemCount: filteredData.length
          }
        };
      }
    }
  }

  /**
   * Stream with aggregation
   */
  async streamReduce<TAcc>(
    partitions: Partition<T>[],
    reduceFn: (accumulator: TAcc, item: T) => TAcc,
    initialValue: TAcc,
    options: StreamOptions = {}
  ): Promise<TAcc> {
    let accumulator = initialValue;

    for await (const chunk of this.stream(partitions, options)) {
      for (const item of chunk.data) {
        accumulator = reduceFn(accumulator, item);
      }
    }

    return accumulator;
  }

  /**
   * Collect all streamed data (use with caution for large datasets)
   */
  async collectAll(
    partitions: Partition<T>[],
    options: StreamOptions = {}
  ): Promise<T[]> {
    const results: T[] = [];

    for await (const chunk of this.stream(partitions, options)) {
      results.push(...chunk.data);
    }

    return results;
  }

  /**
   * Estimate memory usage of buffer
   */
  private estimateMemoryUsage(buffer: T[]): number {
    try {
      return JSON.stringify(buffer).length * 2; // UTF-16
    } catch {
      return buffer.length * 1024; // Rough estimate: 1KB per item
    }
  }

  /**
   * Estimate time remaining
   */
  private estimateTimeRemaining(
    startTime: number,
    processedPartitions: number,
    totalPartitions: number
  ): number {
    if (processedPartitions === 0) return 0;

    const elapsed = Date.now() - startTime;
    const avgTimePerPartition = elapsed / processedPartitions;
    const remainingPartitions = totalPartitions - processedPartitions;

    return avgTimePerPartition * remainingPartitions;
  }
}
