import type { ShardDataSources, ShardLocation } from '@platform/persistence';
import type { DataSource } from 'typeorm';
import { ShardConnections } from './shard-connections.js';

/** The connections of the process pool of shard `DataSource`s. */
export class PooledShardConnections extends ShardConnections {
  constructor(private readonly sources: ShardDataSources) {
    super();
  }

  /** The pooled `DataSource` of the shard, opened on first use. */
  get(location: ShardLocation): Promise<DataSource> {
    return this.sources.get(location);
  }
}
