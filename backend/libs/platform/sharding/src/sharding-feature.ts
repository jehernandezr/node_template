import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';
import { ShardKey } from './model/shard-key.enum.js';
import { ShardStrategy } from './model/shard-strategy.enum.js';
import type { ShardingFeatureOptions } from './model/sharding-feature-options.js';
import type { RoutingKey } from './routing-key.js';
import type { ShardKeyContext } from './shard-key-context.js';

/**
 * Immutable sharding declaration of a module: validates the options on
 * startup and computes the routing key of each query.
 */
export class ShardingFeature<TSource = unknown> {
  private static readonly STRATEGIES: ReadonlySet<string> = new Set(
    Object.values(ShardStrategy),
  );
  private static readonly KEYS: ReadonlySet<string> = new Set(
    Object.values(ShardKey),
  );

  readonly options: ShardingFeatureOptions<TSource>;

  constructor(options: ShardingFeatureOptions<TSource>) {
    this.options = Object.freeze({ ...options });
  }

  /**
   * Validates the declaration.
   * @throws ShardingError `InvalidConfiguration` for an unknown strategy or key, a
   *   `ShardKey.Custom` without `keyResolver` or a `keyResolver` with another key.
   */
  validate(): this {
    if (!ShardingFeature.STRATEGIES.has(this.options.strategy)) {
      throw ShardingFeature.invalid('Unknown shard strategy', 'strategy');
    }
    if (!ShardingFeature.KEYS.has(this.options.key)) {
      throw ShardingFeature.invalid('Unknown shard key', 'key');
    }
    // A resolver without a Custom key would be dead code hiding a misconfiguration.
    const hasResolver = this.options.keyResolver !== undefined;
    if (this.options.key === ShardKey.Custom && !hasResolver) {
      throw ShardingFeature.invalid(
        'ShardKey.Custom needs a keyResolver',
        'keyResolver',
      );
    }
    if (this.options.key !== ShardKey.Custom && hasResolver) {
      throw ShardingFeature.invalid(
        'keyResolver is only valid with ShardKey.Custom',
        'keyResolver',
      );
    }
    return this;
  }

  /**
   * Routing key of a query: the tenant, the context user or what the module's
   * `ShardKeyResolver` reads from `source`.
   * @throws ShardingError `KeyMissing` when the key the module declared is not available.
   *   There is never a default shard.
   */
  keyFor(context: ShardKeyContext, source?: TSource): RoutingKey {
    switch (this.options.key) {
      case ShardKey.Tenant:
        return { keyKind: ShardKey.Tenant };
      case ShardKey.User:
        return {
          keyKind: ShardKey.User,
          keyValue: this.required(context.userId),
        };
      case ShardKey.Custom: {
        const resolver = this.options.keyResolver;
        if (resolver === undefined) {
          throw ShardingFeature.invalid(
            'ShardKey.Custom needs a keyResolver',
            'keyResolver',
          );
        }
        const value =
          source === undefined ? undefined : resolver.resolve(source);
        return {
          keyKind: ShardKey.Custom,
          keyValue: this.required(value),
        };
      }
      default:
        throw ShardingFeature.invalid('Unknown shard key', 'key');
    }
  }

  private static invalid(message: string, option: string): ShardingError {
    return new ShardingError(ShardingErrorCode.InvalidConfiguration, message, {
      details: { option },
    });
  }

  private required(value: string | undefined): string {
    if (value === undefined || value.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.KeyMissing,
        `No routing key for shard key "${this.options.key}"`,
        { details: { keyKind: this.options.key } },
      );
    }
    return value;
  }
}
