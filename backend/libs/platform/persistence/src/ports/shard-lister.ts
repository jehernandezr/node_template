import type { ShardLocation } from '../model/shard-location.js';

/**
 * Lista los shards lógicos del servicio con su instancia. Lo implementa el directorio (en
 * `@platform/adapters-postgres`); lo usan `AcrossShards` y `ShardedMigrationRunner`.
 */
export abstract class ShardLister {
  abstract list(): Promise<readonly ShardLocation[]>;
}
