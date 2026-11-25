import type { DataSource } from 'typeorm';
import type { ShardLocation } from './shard-location.js';

/** A shard and its initialized `DataSource`, without a tenant: what each `AcrossShards` step receives. */
export interface ShardConnection {
  readonly location: ShardLocation;
  readonly dataSource: DataSource;
}
