import type { Clock } from '@platform/kernel';
import type { ShardingStrategy } from '../sharding-strategy.js';
import type { DirectoryChangeApplier } from './directory-change-applier.js';
import type { InstanceResolver } from './instance-resolver.js';
import type { PlacementCache } from './placement-cache.js';
import type { PlacementInvalidator } from './placement-invalidator.js';
import type { PlacementLoader } from './placement-loader.js';
import type { RoutingKeyNormalizer } from './routing-key-normalizer.js';

/** The parts `ShardRouter` resolves and invalidates with. `ShardRouterAssembler` builds them. */
export interface ShardRouterParts {
  readonly clock: Clock;
  readonly strategy: ShardingStrategy;
  readonly currentRegion: string | undefined;
  /** API URL of each known region, by code. */
  readonly regionUrls: ReadonlyMap<string, string>;
  readonly normalizer: RoutingKeyNormalizer;
  readonly cache: PlacementCache;
  readonly loader: PlacementLoader;
  readonly instances: InstanceResolver;
  readonly invalidator: PlacementInvalidator;
  readonly applier: DirectoryChangeApplier;
}
