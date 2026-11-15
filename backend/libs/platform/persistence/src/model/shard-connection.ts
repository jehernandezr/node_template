import type { DataSource } from 'typeorm';
import type { ShardLocation } from './shard-location.js';

/** Un shard y su `DataSource` inicializado, sin tenant: lo que recibe cada paso de `AcrossShards`. */
export interface ShardConnection {
  readonly location: ShardLocation;
  readonly dataSource: DataSource;
}
