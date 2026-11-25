import type {
  ShardKey,
  ShardKeyResolver,
  ShardStrategy,
} from '@platform/sharding';
import type { EntityClass } from '../metadata/entity-metadata.js';

/** Module with per-shard data: declares its routing key. */
export interface ShardedFeatureOptions {
  readonly entities: readonly EntityClass[];
  readonly sharding: {
    readonly key: ShardKey;
    /** `ShardStrategy.Directory` by default. */
    readonly strategy?: ShardStrategy;
    /** Required with `ShardKey.Custom`. */
    readonly keyResolver?: ShardKeyResolver;
  };
}

/** Module with global catalog data. */
export interface CatalogFeatureOptions {
  readonly entities: readonly EntityClass[];
  readonly catalog: true;
}

/** Options of `PersistenceModule.forFeature`. */
export type PersistenceFeatureOptions =
  ShardedFeatureOptions | CatalogFeatureOptions;
