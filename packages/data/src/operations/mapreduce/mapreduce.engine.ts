/**
 * Generic Map-Reduce Engine
 *
 * Provides parallel data processing across partitions with:
 * - Parallel map operations across partitions
 * - Flexible reduce operations
 * - Error resilience and retry logic
 * - Progress tracking and monitoring
 */

import {
  Partition,
  MapReduceOperation,
  MapReduceResult,
  MapReduceStatistics,
  MapReduceOptions,
  RetryConfig,
  DataSourceAdapter
} from '../../layer/data.types';

export interface MapReduceConfig {
  parallel: boolean;
  maxConcurrency?: number;
  retryConfig: RetryConfig;
  timeout?: number;
  enableProfiling?: boolean;
}

/**
 * Generic Map-Reduce Engine for parallel partition processing
 */
export class MapReduceEngine<TInput = any, TOutput = any> {
  private config: MapReduceConfig;
  private adapter: DataSourceAdapter<TInput>;

  constructor(adapter: DataSourceAdapter<TInput>, config?: Partial<MapReduceConfig>) {
    this.adapter = adapter;
    this.config = {
      parallel: true,
      maxConcurrency: 10,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      timeout: 60000, // 60 seconds default
      enableProfiling: false,
      ...config
    };
  }

  /**
   * Execute map-reduce operation across partitions
   */
  async execute(
    partitions: Partition<TInput>[],
    operation: MapReduceOperation<TInput, TOutput>,
    options?: MapReduceOptions
  ): Promise<MapReduceResult<TOutput>> {
    const startTime = Date.now();
    const statistics: MapReduceStatistics = {
      itemsProcessed: 0,
      partitionsProcessed: 0,
      executionTime: 0,
      failures: 0,
      retries: 0
    };

    try {
      // MAP PHASE: Process partitions in parallel
      const mapResults = await this.mapPhase(partitions, operation, statistics);

      // REDUCE PHASE: Aggregate results
      const reduceResults = await this.reducePhase(mapResults, operation, statistics);

      statistics.executionTime = Date.now() - startTime;

      return {
        results: reduceResults,
        statistics
      };
    } catch (error) {
      statistics.executionTime = Date.now() - startTime;
      throw new Error(`Map-reduce operation failed: ${error}`);
    }
  }

  /**
   * MAP PHASE: Apply map function to all partitions
   */
  private async mapPhase(
    partitions: Partition<TInput>[],
    operation: MapReduceOperation<TInput, TOutput>,
    statistics: MapReduceStatistics
  ): Promise<Map<string, any[]>> {
    const intermediateResults = new Map<string, any[]>();

    if (this.config.parallel) {
      // Parallel processing with concurrency control
      const results = await this.processPartitionsInParallel(
        partitions,
        operation,
        statistics
      );

      // Merge results
      results.forEach((partitionResults, partitionId) => {
        partitionResults.forEach(({ key, value }) => {
          if (!intermediateResults.has(key)) {
            intermediateResults.set(key, []);
          }
          intermediateResults.get(key)!.push(value);
        });
      });
    } else {
      // Sequential processing
      for (const partition of partitions) {
        const partitionResults = await this.processPartition(
          partition,
          operation,
          statistics
        );

        partitionResults.forEach(({ key, value }) => {
          if (!intermediateResults.has(key)) {
            intermediateResults.set(key, []);
          }
          intermediateResults.get(key)!.push(value);
        });
      }
    }

    return intermediateResults;
  }

  /**
   * Process partitions in parallel with concurrency control
   */
  private async processPartitionsInParallel(
    partitions: Partition<TInput>[],
    operation: MapReduceOperation<TInput, TOutput>,
    statistics: MapReduceStatistics
  ): Promise<Map<string, Array<{ key: string; value: any }>>> {
    const maxConcurrency = this.config.maxConcurrency || partitions.length;
    const results = new Map<string, Array<{ key: string; value: any }>>();
    const processing: Promise<void>[] = [];
    let index = 0;

    const processNext = async (): Promise<void> => {
      while (index < partitions.length) {
        const currentIndex = index++;
        const partition = partitions[currentIndex];

        if (!partition) continue;

        try {
          const partitionResults = await this.processPartition(
            partition,
            operation,
            statistics
          );
          results.set(partition.id, partitionResults);
        } catch (error) {
          console.error(`Failed to process partition ${partition.id}:`, error);
          statistics.failures++;
        }
      }
    };

    // Start concurrent workers
    for (let i = 0; i < maxConcurrency; i++) {
      processing.push(processNext());
    }

    await Promise.all(processing);

    return results;
  }

  /**
   * Process a single partition with retry logic
   */
  private async processPartition(
    partition: Partition<TInput>,
    operation: MapReduceOperation<TInput, TOutput>,
    statistics: MapReduceStatistics,
    attempt: number = 1
  ): Promise<Array<{ key: string; value: any }>> {
    try {
      // Read data from partition
      const data = await this.adapter.read(partition);

      // Apply map function to each item
      const mappedResults: Array<{ key: string; value: any }> = [];

      for (const item of data) {
        const mapped = operation.map(item, partition.id);
        mapped.forEach(([key, value]) => {
          mappedResults.push({ key, value });
        });
        statistics.itemsProcessed++;
      }

      statistics.partitionsProcessed++;

      return mappedResults;
    } catch (error) {
      // Retry logic
      if (attempt < this.config.retryConfig.maxRetries) {
        statistics.retries++;

        const delay = Math.min(
          this.config.retryConfig.baseDelay *
            Math.pow(this.config.retryConfig.backoffMultiplier, attempt - 1),
          this.config.retryConfig.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.processPartition(partition, operation, statistics, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * REDUCE PHASE: Aggregate intermediate results
   */
  private async reducePhase(
    intermediateResults: Map<string, any[]>,
    operation: MapReduceOperation<TInput, TOutput>,
    statistics: MapReduceStatistics
  ): Promise<TOutput[]> {
    const finalResults: TOutput[] = [];

    for (const [key, values] of intermediateResults.entries()) {
      const reduced = operation.reduce(key, values);
      finalResults.push(reduced);
    }

    return finalResults;
  }

  /**
   * Execute map-only operation (no reduce)
   */
  async map(
    partitions: Partition<TInput>[],
    mapFn: (item: TInput, partition: string) => any[]
  ): Promise<any[]> {
    const operation: MapReduceOperation<TInput, any> = {
      map: mapFn,
      reduce: (key, values) => values[0] // Identity reduce
    };

    const result = await this.execute(partitions, operation);
    return result.results;
  }

  /**
   * Execute simple aggregation across partitions
   */
  async aggregate<TAgg>(
    partitions: Partition<TInput>[],
    aggregateFn: (items: TInput[], partition: string) => TAgg
  ): Promise<TAgg[]> {
    const results: TAgg[] = [];

    const processPartition = async (partition: Partition<TInput>): Promise<TAgg> => {
      const data = await this.adapter.read(partition);
      return aggregateFn(data, partition.id);
    };

    if (this.config.parallel) {
      const promises = partitions.map(p => processPartition(p));
      results.push(...(await Promise.all(promises)));
    } else {
      for (const partition of partitions) {
        results.push(await processPartition(partition));
      }
    }

    return results;
  }

  /**
   * Count total items across partitions
   */
  async count(partitions: Partition<TInput>[]): Promise<number> {
    const counts = await this.aggregate(partitions, items => items.length);
    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * Get statistics for partitions
   */
  async getPartitionStats(
    partitions: Partition<TInput>[]
  ): Promise<
    Array<{
      partitionId: string;
      itemCount: number;
      size?: number;
    }>
  > {
    return this.aggregate(partitions, (items, partitionId) => ({
      partitionId,
      itemCount: items.length,
      size: JSON.stringify(items).length
    }));
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<MapReduceConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): MapReduceConfig {
    return { ...this.config };
  }
}
