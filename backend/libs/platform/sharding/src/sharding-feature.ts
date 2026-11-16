import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';
import { ShardKey } from './model/shard-key.enum.js';
import { ShardStrategy } from './model/shard-strategy.enum.js';
import type { ShardingFeatureOptions } from './model/sharding-feature-options.js';
import type { RoutingKey } from './routing-key.js';
import type { ShardKeyContext } from './shard-key-context.js';

/**
 * Declaración de sharding de un módulo, inmutable: valida las opciones al
 * arrancar y calcula la clave de enrutamiento de cada consulta.
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
   * Valida la declaración.
   * @throws ShardingError `InvalidConfiguration` por una estrategia o clave desconocida, un
   *   `ShardKey.Custom` sin `keyResolver` o un `keyResolver` con otra clave.
   */
  validate(): this {
    if (!ShardingFeature.STRATEGIES.has(this.options.strategy)) {
      throw ShardingFeature.invalid('Unknown shard strategy', 'strategy');
    }
    if (!ShardingFeature.KEYS.has(this.options.key)) {
      throw ShardingFeature.invalid('Unknown shard key', 'key');
    }
    // Un resolver sin clave Custom sería código muerto que oculta una mala configuración.
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
   * Clave de enrutamiento de una consulta: el tenant, el usuario del contexto o lo que el
   * `ShardKeyResolver` del módulo lee de `source`.
   * @throws ShardingError `KeyMissing` cuando la clave que declaró el módulo no está disponible.
   *   Nunca hay un shard por defecto.
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
