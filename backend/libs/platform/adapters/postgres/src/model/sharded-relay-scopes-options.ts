/** Options of `ShardedRelayScopes`. */
export interface ShardedRelayScopesOptions {
  /** Shards published at the same time. Defaults to `AcrossShards.DEFAULT_CONCURRENCY`. */
  readonly concurrency?: number;
  /** Maximum time of one pass on a shard, in milliseconds. Defaults to 30 000. */
  readonly shardTimeoutMs?: number;
}
