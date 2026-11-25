import type { ShardDataSources, ShardLocation } from '@platform/persistence';
import type { DataSource } from 'typeorm';
import type { FakeDataSource } from './fake-data-source.js';

/** Test shard source: picks the test `DataSource` of each location and records the ones requested. */
export class FakeShardDataSources {
  readonly requested: ShardLocation[] = [];

  constructor(
    private readonly dataSourceFor: (location: ShardLocation) => FakeDataSource,
  ) {}

  get(location: ShardLocation): Promise<DataSource> {
    this.requested.push(location);
    return Promise.resolve(this.dataSourceFor(location).asDataSource());
  }

  /** Exposes the fake with the `ShardDataSources` shape that `ShardsHealthCheck` requires. */
  asShardDataSources(): ShardDataSources {
    return this as unknown as ShardDataSources;
  }
}
