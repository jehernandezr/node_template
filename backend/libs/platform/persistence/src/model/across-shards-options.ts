/** Options of `AcrossShards.run`. Without a value, `AcrossShards.DEFAULT_CONCURRENCY` and `DEFAULT_SHARD_TIMEOUT_MS` are used. */
export interface AcrossShardsOptions {
  readonly concurrency?: number;
  readonly shardTimeoutMs?: number;
}
