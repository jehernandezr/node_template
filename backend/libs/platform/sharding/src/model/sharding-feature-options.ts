import type { ShardKey } from './shard-key.enum.js';
import type { ShardKeyResolver } from './shard-key-resolver.js';
import type { ShardStrategy } from './shard-strategy.enum.js';

/** Declaración de sharding de un módulo. `keyResolver` es obligatorio con `ShardKey.Custom` y se rechaza con las demás. */
export interface ShardingFeatureOptions<TSource = unknown> {
  readonly strategy: ShardStrategy;
  readonly key: ShardKey;
  readonly keyResolver?: ShardKeyResolver<TSource>;
}
