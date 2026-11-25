import type { ShardKey } from './shard-key.enum.js';
import type { ShardKeyResolver } from './shard-key-resolver.js';
import type { ShardStrategy } from './shard-strategy.enum.js';

/** Sharding declaration of a module. `keyResolver` is required with `ShardKey.Custom` and rejected with the others. */
export interface ShardingFeatureOptions<TSource = unknown> {
  readonly strategy: ShardStrategy;
  readonly key: ShardKey;
  readonly keyResolver?: ShardKeyResolver<TSource>;
}
