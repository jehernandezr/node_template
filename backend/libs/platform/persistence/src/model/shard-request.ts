import type { ShardAccess } from '@platform/sharding';
import type { PersistenceFeature } from '../persistence-feature.js';

/** What is to be resolved: the module's sharding declaration and the access intent. */
export interface ShardRequest {
  readonly feature: PersistenceFeature;
  /** Entity, criteria or request that the module's `ShardKeyResolver` reads with `ShardKey.Custom`. */
  readonly source?: unknown;
  readonly access: ShardAccess;
}
