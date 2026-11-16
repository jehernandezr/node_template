import { SystemClock, TenantId } from '@platform/kernel';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { ShardingGuard } from '../errors/sharding-guard.js';
import { ConsistentHashStrategy } from '../sharding-strategy.js';
import { DirectoryChangeApplier } from './directory-change-applier.js';
import { InstanceResolver } from './instance-resolver.js';
import { InvalidationLog } from './invalidation-log.js';
import { PlacementCache } from './placement-cache.js';
import { PlacementInvalidator } from './placement-invalidator.js';
import { PlacementLoader } from './placement-loader.js';
import { RoutingKeyNormalizer } from './routing-key-normalizer.js';
import { SHARD_ROUTER_DEFAULTS } from './shard-router-defaults.js';
import type { ShardRouterOptions } from './shard-router-options.js';
import type { ShardRouterParts } from './shard-router-parts.js';

/** Valida las opciones de `ShardRouter` y construye sus piezas con las dependencias cruzadas ya conectadas. */
export class ShardRouterAssembler {
  /**
   * @throws ShardingError `InvalidConfiguration` por un TTL, un límite o un patrón inválido.
   */
  static assemble(options: ShardRouterOptions): ShardRouterParts {
    const localTtlMs = options.localTtlMs ?? SHARD_ROUTER_DEFAULTS.localTtlMs;
    const sharedTtlMs =
      options.sharedTtlMs ?? SHARD_ROUTER_DEFAULTS.sharedTtlMs;
    const tombstoneTtlMs =
      options.tombstoneTtlMs ?? SHARD_ROUTER_DEFAULTS.tombstoneTtlMs;
    const maxPlacements =
      options.maxPlacements ?? SHARD_ROUTER_DEFAULTS.maxPlacements;
    const maxInstances =
      options.maxInstances ?? SHARD_ROUTER_DEFAULTS.maxInstances;
    const maxKeyLength =
      options.maxKeyLength ?? SHARD_ROUTER_DEFAULTS.maxKeyLength;

    ShardingGuard.instance.nonNegativeFinite('localTtlMs', localTtlMs);
    ShardingGuard.instance.nonNegativeFinite('sharedTtlMs', sharedTtlMs);
    ShardingGuard.instance.nonNegativeFinite('tombstoneTtlMs', tombstoneTtlMs);
    if (tombstoneTtlMs === 0) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'tombstoneTtlMs must be a finite number > 0',
        { details: { option: 'tombstoneTtlMs' } },
      );
    }
    ShardingGuard.instance.positiveInteger('maxPlacements', maxPlacements);
    ShardingGuard.instance.positiveInteger('maxInstances', maxInstances);
    ShardingGuard.instance.positiveInteger('maxKeyLength', maxKeyLength);

    const clock = options.clock ?? new SystemClock();
    const onError = options.onCacheError ?? (() => undefined);
    const normalizer = new RoutingKeyNormalizer(
      options.tenantIdPattern ?? TenantId.DEFAULT_PATTERN,
      maxKeyLength,
    );
    // Un solo registro de invalidaciones de tenants, compartido por la carga, la invalidación y los cambios.
    const tenantInvalidations = new InvalidationLog(maxPlacements);
    const cache = new PlacementCache(
      { localTtlMs, sharedTtlMs, tombstoneTtlMs, maxPlacements },
      clock,
      options.sharedCache,
      onError,
    );
    const instances = new InstanceResolver(
      options.directory,
      clock,
      localTtlMs,
      maxInstances,
    );
    return {
      clock,
      strategy: options.strategy ?? new ConsistentHashStrategy(),
      currentRegion: options.currentRegion,
      normalizer,
      cache,
      loader: new PlacementLoader(
        options.directory,
        cache,
        tenantInvalidations,
        clock,
        maxPlacements,
      ),
      instances,
      invalidator: new PlacementInvalidator(
        cache,
        instances,
        tenantInvalidations,
        normalizer,
        options.changes,
        onError,
      ),
      applier: new DirectoryChangeApplier(
        cache,
        instances,
        tenantInvalidations,
        normalizer,
        onError,
      ),
    };
  }
}
