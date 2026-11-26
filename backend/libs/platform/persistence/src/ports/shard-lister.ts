import type { ShardLocation } from '../model/shard-location.js';

/**
 * Lists the logical shards of the service with their instance. Implemented by the directory (in
 * `@platform/adapters-postgres`); used by `AcrossShards` and `ShardedMigrationRunner`.
 */
export abstract class ShardLister {
  /**
   * Lists the shards of the service with their instance.
   * @returns The shard locations.
   */
  abstract list(): Promise<readonly ShardLocation[]>;
}
