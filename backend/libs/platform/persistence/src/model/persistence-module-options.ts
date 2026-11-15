import type { ShardKey, ShardStrategy } from '@platform/sharding';
import type { ShardKeyResolver } from '@platform/sharding';
import type { DatabaseSetDefinition } from './database-set-definition.js';

/** Declaración de sharding por defecto del servicio, la que usan las transacciones sin módulo. */
export interface DefaultShardingOptions {
  readonly key: ShardKey;
  readonly strategy?: ShardStrategy;
  readonly keyResolver?: ShardKeyResolver;
}

/** Opciones de `PersistenceModule.forRoot` que pueden salir de la configuración. */
export interface PersistenceModuleOptions {
  /** Entidades y migraciones de las bases de shard (las del servicio más `platformShardEntities` y `platformShardMigrations`). */
  readonly shard: DatabaseSetDefinition;
  /** Entidades y migraciones del catálogo. */
  readonly catalog: DatabaseSetDefinition;
  /** Por defecto `{ key: ShardKey.Tenant }`. */
  readonly defaultSharding?: DefaultShardingOptions;
  /** Con `true`, sin un `ShardScope` activo toda resolución falla con `PLATFORM.SHARDING.KEY_MISSING`. Por defecto `false`. */
  readonly requireScope?: boolean;
  /** Milisegundos sin uso tras los que `ShardDataSources` cierra un `DataSource`. Por defecto 300 000. */
  readonly idleTtlMs?: number;
}
