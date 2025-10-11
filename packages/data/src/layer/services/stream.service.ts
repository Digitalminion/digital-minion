/**
 * Stream Service
 *
 * Handles streaming operations for large datasets.
 */

import { StreamProcessor } from '../../operations/stream/stream.processor';
import { Partition, StreamOptions, StreamChunk } from '../data.types';

export class StreamService<T = any> {
  private streamProcessor: StreamProcessor<T>;

  constructor(streamProcessor: StreamProcessor<T>) {
    this.streamProcessor = streamProcessor;
  }

  /**
   * Stream data from partitions
   */
  async *stream(
    partitions: Partition<T>[],
    options?: StreamOptions
  ): AsyncGenerator<StreamChunk<T>> {
    yield* this.streamProcessor.stream(partitions, options);
  }

  /**
   * Stream and transform data
   */
  async *streamTransform<TOut>(
    partitions: Partition<T>[],
    transform: (item: T) => TOut,
    options?: StreamOptions
  ): AsyncGenerator<StreamChunk<TOut>> {
    for await (const chunk of this.streamProcessor.stream(partitions, options)) {
      yield {
        data: chunk.data.map(transform),
        hasMore: chunk.hasMore,
        metadata: chunk.metadata
      };
    }
  }

  /**
   * Stream and filter data
   */
  async *streamFilter(
    partitions: Partition<T>[],
    predicate: (item: T) => boolean,
    options?: StreamOptions
  ): AsyncGenerator<StreamChunk<T>> {
    for await (const chunk of this.streamProcessor.stream(partitions, options)) {
      const filtered = chunk.data.filter(predicate);
      if (filtered.length > 0) {
        yield {
          data: filtered,
          hasMore: chunk.hasMore,
          metadata: chunk.metadata
        };
      }
    }
  }

  /**
   * Collect stream into array (use with caution for large datasets)
   */
  async collect(
    partitions: Partition<T>[],
    options?: StreamOptions
  ): Promise<T[]> {
    const results: T[] = [];
    for await (const chunk of this.streamProcessor.stream(partitions, options)) {
      results.push(...chunk.data);
    }
    return results;
  }
}
