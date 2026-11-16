/** Opciones de `AcrossShards.run`. Sin valor se usan `AcrossShards.DEFAULT_CONCURRENCY` y `DEFAULT_SHARD_TIMEOUT_MS`. */
export interface AcrossShardsOptions {
  readonly concurrency?: number;
  readonly shardTimeoutMs?: number;
}
