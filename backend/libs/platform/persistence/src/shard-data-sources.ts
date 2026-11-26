import type { Clock } from '@platform/kernel';
import type { DataSource } from 'typeorm';
import { PersistenceErrorCode } from './errors/persistence-error-code.enum.js';
import { PersistenceError } from './errors/persistence-error.js';
import { DatabaseKind } from './model/database-kind.enum.js';
import type { ShardDataSourcesOptions } from './model/shard-data-sources-options.js';
import type { ShardLocation } from './model/shard-location.js';
import type { DataSourceFactory } from './ports/data-source-factory.js';
import type { InstanceEndpointResolver } from './ports/instance-endpoint-resolver.js';

/** A logical shard with its `DataSource`, its instance and the instant of its last use. */
interface Entry {
  readonly instance: string;
  readonly dataSource: DataSource;
  /** Shared between concurrent calls: they all wait for the same initialization. */
  readonly ready: Promise<DataSource>;
  lastUsedMs: number;
}

/**
 * One TypeORM `DataSource` per logical shard. Creates them on first use, closes the unused ones
 * and closes the old one when a shard changes instance.
 */
export class ShardDataSources {
  private readonly entries = new Map<string, Entry>();
  private shutDown = false;

  constructor(
    private readonly factory: DataSourceFactory,
    private readonly endpoints: InstanceEndpointResolver,
    private readonly clock: Clock,
    private readonly options: ShardDataSourcesOptions,
  ) {}

  /**
   * Returns the initialized `DataSource` of the shard.
   * Without this, the next request would receive the failed initialization instead of retrying it.
   * @throws PersistenceError `ShuttingDown` if they were already closed: a job still running during shutdown
   * would open a pool that nobody closes.
   */
  async get(location: ShardLocation): Promise<DataSource> {
    this.assertOpen();
    const now = this.clock.now().getTime();
    const existing = this.entries.get(location.logicalShard);
    if (existing !== undefined && existing.instance === location.instance) {
      existing.lastUsedMs = now;
      return existing.ready;
    }
    if (existing !== undefined) {
      this.entries.delete(location.logicalShard);
      await this.dispose(existing);
      this.assertOpen();
    }

    const resolved = this.endpoints.resolve(location.instance);
    const dataSource = this.factory.create(
      {
        kind: DatabaseKind.Shard,
        instance: location.instance,
        database: location.logicalShard,
      },
      resolved,
    );
    const ready = dataSource.initialize();
    this.entries.set(location.logicalShard, {
      instance: location.instance,
      dataSource,
      ready,
      lastUsedMs: now,
    });
    try {
      await ready;
    } catch (error) {
      if (this.entries.get(location.logicalShard)?.ready === ready) {
        this.entries.delete(location.logicalShard);
      }
      throw error;
    }
    await this.closeIdle();
    return dataSource;
  }

  /** Closes the `DataSource`s unused for longer than `idleTtlMs`. Returns how many it closed. */
  async closeIdle(): Promise<number> {
    const now = this.clock.now().getTime();
    const idle = [...this.entries].filter(
      ([, entry]) => now - entry.lastUsedMs > this.options.idleTtlMs,
    );
    for (const [logicalShard] of idle) {
      this.entries.delete(logicalShard);
    }
    await Promise.all(idle.map(([, entry]) => this.dispose(entry)));
    return idle.length;
  }

  /** Ids of the shards with an open `DataSource`. */
  activeShards(): readonly string[] {
    return [...this.entries.keys()];
  }

  /** Closes all of them. Called when the process shuts down. */
  async close(): Promise<void> {
    this.shutDown = true;
    const all = [...this.entries.values()];
    this.entries.clear();
    await Promise.all(all.map((entry) => this.dispose(entry)));
  }

  private assertOpen(): void {
    if (this.shutDown) {
      throw new PersistenceError(
        PersistenceErrorCode.ShuttingDown,
        'Shard data sources are closed',
      );
    }
  }

  /**
   * If the initialization never finished there is nothing to close.
   */
  private async dispose(entry: Entry): Promise<void> {
    try {
      const dataSource = await entry.ready;
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch {}
  }
}
