/** Opciones de `ShardedRelayScopes`. */
export interface ShardedRelayScopesOptions {
  /** Shards que se publican a la vez. Por defecto `AcrossShards.DEFAULT_CONCURRENCY`. */
  readonly concurrency?: number;
  /** Tiempo máximo de una pasada en un shard, en milisegundos. Por defecto 30 000. */
  readonly shardTimeoutMs?: number;
}
