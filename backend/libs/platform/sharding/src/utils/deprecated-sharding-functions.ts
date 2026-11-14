import { ShardDirectoryChangeCodec } from '../shard-directory-change-codec.js';
import type { ShardDirectoryChanged } from '../model/shard-directory-changed.js';
import type { ShardingFeatureOptions } from '../model/sharding-feature-options.js';
import type { RoutingKey } from '../routing-key.js';
import type { ShardKeyContext } from '../shard-key-context.js';
import { ShardingFeature } from '../sharding-feature.js';

/** @deprecated Usa `new ShardingFeature(options).validate()`. */
export function validateShardingFeature<TSource>(
  options: ShardingFeatureOptions<TSource>,
): ShardingFeatureOptions<TSource> {
  return new ShardingFeature(options).validate().options;
}

/** @deprecated Usa `new ShardingFeature(options).keyFor(context, source)`. */
export function routingKeyFor<TSource>(
  options: ShardingFeatureOptions<TSource>,
  context: ShardKeyContext,
  source?: TSource,
): RoutingKey {
  return new ShardingFeature(options).keyFor(context, source);
}

/** @deprecated Usa `ShardDirectoryChangeCodec.encode`. */
export function encodeShardDirectoryChanged(
  event: ShardDirectoryChanged,
): string {
  return ShardDirectoryChangeCodec.encode(event);
}

/** @deprecated Usa `ShardDirectoryChangeCodec.decode`. */
export function decodeShardDirectoryChanged(
  raw: string,
): ShardDirectoryChanged | undefined {
  return ShardDirectoryChangeCodec.decode(raw);
}
