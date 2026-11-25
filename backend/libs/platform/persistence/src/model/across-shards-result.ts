import type { ShardFailure } from './shard-failure.js';

/** Result of traversing several shards. */
export interface AcrossShardsResult<T> {
  readonly results: readonly { readonly shard: string; readonly value: T }[];
  readonly failures: readonly ShardFailure[];
  /** `true` if some shard failed: the result does not include its rows. */
  readonly partial: boolean;
}
