import { ShardingError, ShardingErrorCode } from './errors.js';
import {
  ShardKey,
  ShardStrategy,
  type ShardingFeatureOptions,
} from './types.js';

const STRATEGIES: ReadonlySet<string> = new Set(Object.values(ShardStrategy));
const KEYS: ReadonlySet<string> = new Set(Object.values(ShardKey));

/** Who is asking, as the request context knows it. */
export interface ShardKeyContext {
  readonly tenantId: string;
  /** Required by `ShardKey.User`. */
  readonly userId?: string;
}

/** Routing input for `ShardRouter.resolve`, without the access intent. */
export interface RoutingKey {
  readonly keyKind: ShardKey;
  /** Undefined for `ShardKey.Tenant`: the router uses the tenant id. */
  readonly keyValue?: string;
}

function invalid(message: string, option: string): ShardingError {
  return new ShardingError(ShardingErrorCode.InvalidConfiguration, message, {
    details: { option },
  });
}

/**
 * Validates a module's sharding declaration at startup.
 * @throws ShardingError `InvalidConfiguration` for an unknown strategy or key, a `ShardKey.Custom` without
 *   `keyResolver`, or a `keyResolver` with any other key.
 */
export function validateShardingFeature<TSource>(
  options: ShardingFeatureOptions<TSource>,
): ShardingFeatureOptions<TSource> {
  if (!STRATEGIES.has(options.strategy)) {
    throw invalid('Unknown shard strategy', 'strategy');
  }
  if (!KEYS.has(options.key)) {
    throw invalid('Unknown shard key', 'key');
  }
  const hasResolver = options.keyResolver !== undefined;
  if (options.key === ShardKey.Custom && !hasResolver) {
    throw invalid('ShardKey.Custom needs a keyResolver', 'keyResolver');
  }
  if (options.key !== ShardKey.Custom && hasResolver) {
    throw invalid(
      'keyResolver is only valid with ShardKey.Custom',
      'keyResolver',
    );
  }
  return options;
}

/**
 * Routing key of one query for a module's declaration: the tenant, the user of the context, or what the
 * module's `ShardKeyResolver` reads from `source`.
 * @throws ShardingError `KeyMissing` when the key the module declared is not available. There is never a
 *   default shard.
 */
export function routingKeyFor<TSource>(
  options: ShardingFeatureOptions<TSource>,
  context: ShardKeyContext,
  source?: TSource,
): RoutingKey {
  switch (options.key) {
    case ShardKey.Tenant:
      return { keyKind: ShardKey.Tenant };
    case ShardKey.User:
      return {
        keyKind: ShardKey.User,
        keyValue: required(context.userId, options.key),
      };
    case ShardKey.Custom: {
      const resolver = options.keyResolver;
      if (resolver === undefined) {
        throw invalid('ShardKey.Custom needs a keyResolver', 'keyResolver');
      }
      const value = source === undefined ? undefined : resolver.resolve(source);
      return {
        keyKind: ShardKey.Custom,
        keyValue: required(value, options.key),
      };
    }
    default:
      throw invalid('Unknown shard key', 'key');
  }
}

function required(value: string | undefined, key: ShardKey): string {
  if (value === undefined || value.length === 0) {
    throw new ShardingError(
      ShardingErrorCode.KeyMissing,
      `No routing key for shard key "${key}"`,
      { details: { keyKind: key } },
    );
  }
  return value;
}
