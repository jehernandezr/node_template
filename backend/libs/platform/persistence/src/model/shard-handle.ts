import type { ResolvedShard } from '@platform/sharding';
import type { DataSource } from 'typeorm';

/** An already resolved shard and its initialized `DataSource`. */
export interface ShardHandle {
  readonly resolved: ResolvedShard;
  readonly dataSource: DataSource;
}
