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
  private readonly switching = new Map<string, Promise<DataSource>>();
  private shutDown = false;

  constructor(
    private readonly factory: DataSourceFactory,
    private readonly endpoints: InstanceEndpointResolver,
    private readonly clock: Clock,
    private readonly options: ShardDataSourcesOptions,
  ) {}

  /**
   * Returns the initialized `DataSource` of the shard. A failed initialization is forgotten, so the next request
   * initializes again.
   * @param location Shard and its instance.
   * @returns The data source.
   * @throws PersistenceError `ShuttingDown` if they were already closed: a job still running during shutdown
   * would open a pool that nobody closes.
   */
  async get(location: ShardLocation): Promise<DataSource> {
    this.assertOpen();
    const existing = this.entries.get(location.logicalShard);
    if (existing !== undefined && existing.instance === location.instance) {
      existing.lastUsedMs = this.clock.now().getTime();
      return existing.ready;
    }
    const pending = this.switching.get(location.logicalShard);
    if (pending !== undefined) {
      await pending.catch(() => undefined);
      return this.get(location);
    }
    const switched = this.switchTo(location, existing);
    this.switching.set(location.logicalShard, switched);
    try {
      return await switched;
    } finally {
      if (this.switching.get(location.logicalShard) === switched) {
        this.switching.delete(location.logicalShard);
      }
    }
  }

  /**
   * Opens the shard on its instance, closing first the DataSource of another instance. Only one switch of a shard
   * runs at a time: a concurrent request waits for it and then reuses or replaces what it opened, so no
   * DataSource is left open outside the map.
   */
  private async switchTo(
    location: ShardLocation,
    existing: Entry | undefined,
  ): Promise<DataSource> {
    const now = this.clock.now().getTime();
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

  /**
   * Closes the `DataSource`s unused for longer than `idleTtlMs`. Returns how many it closed.
   * @returns How many were closed.
   */
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

  /**
   * Ids of the shards with an open `DataSource`.
   * @returns The shard ids.
   */
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
