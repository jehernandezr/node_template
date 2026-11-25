import type { ShardKey, ShardStrategy } from '@platform/sharding';
import type { ShardKeyResolver } from '@platform/sharding';
import type { DatabaseSetDefinition } from './database-set-definition.js';

/** Default sharding declaration of the service, used by transactions without a module. */
export interface DefaultShardingOptions {
  readonly key: ShardKey;
  readonly strategy?: ShardStrategy;
  readonly keyResolver?: ShardKeyResolver;
}

/** Options of `PersistenceModule.forRoot` that can come from the configuration. */
export interface PersistenceModuleOptions {
  /** Entities and migrations of the shard databases (the service's plus `platformShardEntities` and `platformShardMigrations`). */
  readonly shard: DatabaseSetDefinition;
  /** Entities and migrations of the catalog. */
  readonly catalog: DatabaseSetDefinition;
  /** `{ key: ShardKey.Tenant }` by default. */
  readonly defaultSharding?: DefaultShardingOptions;
  /** With `true`, without an active `ShardScope` every resolution fails with `PLATFORM.SHARDING.KEY_MISSING`. `false` by default. */
  readonly requireScope?: boolean;
  /**
   * With `true` each write waits for its tenant's relocation gate to open and goes through the
   * `tenant_write_fences` barrier, which the shard must have migrated. `false` by default.
   */
  readonly tenantMoves?: boolean;
  /** Idle milliseconds after which `ShardDataSources` closes a `DataSource`. 300 000 by default. */
  readonly idleTtlMs?: number;
}
