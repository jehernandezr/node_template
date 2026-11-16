import type { ResolvedShard } from '@platform/sharding';
import type { DataSource } from 'typeorm';

/** Un shard ya resuelto y su `DataSource` inicializado. */
export interface ShardHandle {
  readonly resolved: ResolvedShard;
  readonly dataSource: DataSource;
}
