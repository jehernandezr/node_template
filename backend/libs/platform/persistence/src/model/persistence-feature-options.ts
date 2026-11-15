import type {
  ShardKey,
  ShardKeyResolver,
  ShardStrategy,
} from '@platform/sharding';
import type { EntityClass } from '../metadata/entity-metadata.js';

/** Módulo con datos por shard: declara su llave de enrutamiento. */
export interface ShardedFeatureOptions {
  readonly entities: readonly EntityClass[];
  readonly sharding: {
    readonly key: ShardKey;
    /** Por defecto `ShardStrategy.Directory`. */
    readonly strategy?: ShardStrategy;
    /** Obligatorio con `ShardKey.Custom`. */
    readonly keyResolver?: ShardKeyResolver;
  };
}

/** Módulo con datos del catálogo global. */
export interface CatalogFeatureOptions {
  readonly entities: readonly EntityClass[];
  readonly catalog: true;
}

/** Opciones de `PersistenceModule.forFeature`. */
export type PersistenceFeatureOptions =
  ShardedFeatureOptions | CatalogFeatureOptions;
