/**
 * Data Layer - Main Orchestration (REFACTORED)
 *
 * Clean facade over specialized services:
 * - QueryService: Read operations with caching
 * - WriteService: Insert, update, delete
 * - IndexService: Index management
 * - StreamService: Streaming operations
 */

import { PartitionManifestManager } from './partition-manifest.manager';
import { MapReduceEngine } from '../operations/mapreduce/mapreduce.engine';
import { IndexManager } from '../operations/index/index.manager';
import { CacheManager } from '../operations/cache/cache.manager';
import { StreamProcessor } from '../operations/stream/stream.processor';
import { FilterComposer } from '../operations/filter/filter.composer';
import { RetryManager } from '../operations/retry/retry.manager';
import { JSONLAdapter } from './adapters/jsonl.adapter';
import { JSONAdapter } from './adapters/json.adapter';

// Services
import { QueryService } from './services/query.service';
import { WriteService } from './services/write.service';
import { IndexService } from './services/index.service';
import { StreamService } from './services/stream.service';

import {
  Query,
  QueryResult,
  Partition,
  DataSourceAdapter,
  FilterCriteria,
  MapReduceOperation,
  MapReduceResult,
  StreamOptions,
  StreamChunk,
  CacheConfig,
  RetryConfig
} from './data.types';

export interface DataLayerConfig {
  basePath: string;
  collection: string;
  adapterType?: 'jsonl' | 'json';
  enableCaching?: boolean;
  cacheConfig?: Partial<CacheConfig>;
  retryConfig?: Partial<RetryConfig>;
  autoDiscoverPartitions?: boolean;
}

export interface DataLayerDependencies<T> {
  adapter?: DataSourceAdapter<T>;
  manifestManager?: PartitionManifestManager<T>;
  mapReduceEngine?: MapReduceEngine<T, any>;
  cacheManager?: CacheManager<T[]>;
  filterComposer?: FilterComposer<T>;
  retryManager?: RetryManager;
  indexManager?: IndexManager<T>;
  streamProcessor?: StreamProcessor<T>;
}

/**
 * Data Layer - Clean service-based architecture
 */
export class DataLayer<T = any> {
  private config: DataLayerConfig;

  // Core infrastructure
  private manifestManager: PartitionManifestManager<T>;
  private mapReduceEngine: MapReduceEngine<T, any>;
  private adapter: DataSourceAdapter<T>;

  // Services
  private queryService: QueryService<T>;
  private writeService: WriteService<T>;
  private indexService: IndexService<T>;
  private streamService: StreamService<T>;

  constructor(config: DataLayerConfig, dependencies?: Partial<DataLayerDependencies<T>>) {
    this.config = {
      adapterType: 'jsonl',
      enableCaching: true,
      autoDiscoverPartitions: true,
      ...config
    };

    // Use provided dependencies or create defaults
    const adapter = dependencies?.adapter ?? this.createAdapter(this.config.adapterType!);
    this.adapter = adapter;
    this.manifestManager = dependencies?.manifestManager ?? new PartitionManifestManager(config.basePath, config.collection);
    this.mapReduceEngine = dependencies?.mapReduceEngine ?? new MapReduceEngine(adapter);

    // Create services with dependency injection support
    const cacheManager = dependencies?.cacheManager ?? new CacheManager<T[]>(config.cacheConfig);
    const filterComposer = dependencies?.filterComposer ?? new FilterComposer<T>();
    const retryManager = dependencies?.retryManager ?? new RetryManager(config.retryConfig);
    const indexManager = dependencies?.indexManager ?? new IndexManager<T>();
    const streamProcessor = dependencies?.streamProcessor ?? new StreamProcessor(adapter);

    this.queryService = new QueryService(
      this.mapReduceEngine,
      cacheManager,
      filterComposer,
      retryManager,
      this.config.enableCaching!
    );

    this.writeService = new WriteService(
      adapter,
      filterComposer,
      retryManager,
      config.basePath
    );

    this.indexService = new IndexService(indexManager);
    this.streamService = new StreamService(streamProcessor);
  }

  /**
   * Initialize data layer
   */
  async initialize(): Promise<void> {
    await this.adapter.connect();

    try {
      await this.manifestManager.loadManifest();
    } catch (error) {
      await this.manifestManager.createManifest({
        collection: this.config.collection,
        description: `Data collection for ${this.config.collection}`
      });
    }

    if (this.config.autoDiscoverPartitions) {
      await this.manifestManager.discoverPartitions(this.config.basePath);
    }
  }

  // ===== QUERY OPERATIONS =====

  async query(query: Query<T>): Promise<QueryResult<T>> {
    const partitions = this.getQueryPartitions(query);
    return this.queryService.query(query, partitions);
  }

  async count(filter?: FilterCriteria<T>): Promise<number> {
    const data = await this.getAllData();
    return this.queryService.count(data, filter);
  }

  // ===== WRITE OPERATIONS =====

  async insert(data: T[], partitionId?: string): Promise<void> {
    let targetPartitionId = partitionId || this.getDefaultPartition()?.id;

    // Auto-create default partition if none exists
    if (!targetPartitionId) {
      const defaultPartitionId = 'default';
      this.manifestManager.addPartition({
        id: defaultPartitionId,
        location: `${this.config.basePath}/${this.config.collection}/${defaultPartitionId}.${this.config.adapterType}`,
        type: 'file',
        name: defaultPartitionId
      });
      targetPartitionId = defaultPartitionId;
    }

    // Get full partition object from manifest
    const partition = this.manifestManager.getPartition(targetPartitionId);
    if (!partition) {
      throw new Error(`Partition '${targetPartitionId}' not found in manifest`);
    }

    await this.writeService.insertToPartition(data, partition);

    // Clear cache after write
    this.clearCache();
  }

  async update(filter: FilterCriteria<T>, updates: Partial<T>): Promise<number> {
    const partitions = this.manifestManager.getAllPartitions();
    let totalUpdated = 0;

    for (const partition of partitions) {
      const updated = await this.writeService.updateInPartition(partition, filter, updates);
      totalUpdated += updated;
    }

    // Clear cache after write
    this.clearCache();

    return totalUpdated;
  }

  async delete(filter: FilterCriteria<T>): Promise<number> {
    const partitions = this.manifestManager.getAllPartitions();
    let totalDeleted = 0;

    for (const partition of partitions) {
      const deleted = await this.writeService.deleteFromPartition(partition, filter);
      totalDeleted += deleted;
    }

    // Clear cache after write
    this.clearCache();

    return totalDeleted;
  }

  // ===== INDEX OPERATIONS =====

  async createIndex(
    indexName: string,
    fields: string[],
    options?: { unique?: boolean; caseSensitive?: boolean }
  ): Promise<void> {
    const data = await this.getAllData();
    await this.indexService.createIndex(indexName, fields, data, options);
  }

  async queryWithIndex(indexName: string, value: any): Promise<T[]> {
    const data = await this.getAllData();
    return this.indexService.queryWithIndex(indexName, value, data);
  }

  dropIndex(indexName: string): void {
    this.indexService.dropIndex(indexName);
  }

  listIndexes(): string[] {
    return this.indexService.listIndexes();
  }

  // ===== STREAM OPERATIONS =====

  async *stream(options?: StreamOptions): AsyncGenerator<StreamChunk<T>> {
    const partitions = this.manifestManager.getAllPartitions();
    yield* this.streamService.stream(partitions, options);
  }

  async *streamTransform<TOut>(
    transform: (item: T) => TOut,
    options?: StreamOptions
  ): AsyncGenerator<StreamChunk<TOut>> {
    const partitions = this.manifestManager.getAllPartitions();
    yield* this.streamService.streamTransform(partitions, transform, options);
  }

  async *streamFilter(
    predicate: (item: T) => boolean,
    options?: StreamOptions
  ): AsyncGenerator<StreamChunk<T>> {
    const partitions = this.manifestManager.getAllPartitions();
    yield* this.streamService.streamFilter(partitions, predicate, options);
  }

  // ===== MAP-REDUCE OPERATIONS =====

  async mapReduce<TOutput>(
    operation: MapReduceOperation<T, TOutput>,
    partitionIds?: string[]
  ): Promise<MapReduceResult<TOutput>> {
    const partitions = partitionIds
      ? this.manifestManager.getAllPartitions().filter(p => partitionIds.includes(p.id))
      : this.manifestManager.getAllPartitions();

    return this.mapReduceEngine.execute(partitions, operation);
  }

  // ===== STATISTICS & LIFECYCLE =====

  async getStatistics() {
    const partitions = this.manifestManager.getAllPartitions();
    const allData = await this.getAllData();

    return {
      totalPartitions: partitions.length,
      totalItems: allData.length,
      partitions: partitions.map(p => ({
        id: p.id,
        location: p.location
      }))
    };
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  clearCache(): void {
    this.queryService.clearCache();
  }

  // ===== PRIVATE HELPERS =====

  private async getAllData(): Promise<T[]> {
    const partitions = this.manifestManager.getAllPartitions();
    return this.streamService.collect(partitions);
  }

  private getQueryPartitions(query: Query<T>): Partition<T>[] {
    if (query.partitions && query.partitions.length > 0) {
      return query.partitions
        .map(id => this.manifestManager.getPartition(id))
        .filter(Boolean) as Partition<T>[];
    }
    return this.manifestManager.getAllPartitions();
  }

  private getDefaultPartition(): Partition<T> | undefined {
    const manifest = this.manifestManager.getManifest();
    const defaultId = manifest.settings.defaultPartition;

    if (defaultId) {
      return this.manifestManager.getPartition(defaultId);
    }

    const partitions = this.manifestManager.getAllPartitions();
    return partitions[0];
  }

  private createAdapter(type: 'jsonl' | 'json'): DataSourceAdapter<T> {
    if (type === 'jsonl') {
      return new JSONLAdapter<T>();
    } else {
      return new JSONAdapter<T>();
    }
  }
}
