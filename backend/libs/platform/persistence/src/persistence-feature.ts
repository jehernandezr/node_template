import {
  ShardingFeature,
  ShardStrategy,
  type ShardKey,
  type ShardKeyResolver,
} from '@platform/sharding';
import type { EntityClass } from './metadata/entity-metadata.js';

/** Data to build a {@link PersistenceFeature}. */
export interface PersistenceFeatureInit {
  readonly key: ShardKey;
  readonly strategy?: ShardStrategy;
  readonly keyResolver?: ShardKeyResolver;
  readonly entities?: readonly EntityClass[];
}

/**
 * Validated sharding declaration of a module, with the entities it registers.
 * `PersistenceModule.forFeature` creates it and injects it into the module's repositories.
 */
export class PersistenceFeature {
  readonly sharding: ShardingFeature;
  readonly entities: readonly EntityClass[];

  /** @throws ShardingError `InvalidConfiguration` if the sharding declaration is invalid. */
  constructor(init: PersistenceFeatureInit) {
    this.sharding = new ShardingFeature({
      strategy: init.strategy ?? ShardStrategy.Directory,
      key: init.key,
      ...(init.keyResolver === undefined
        ? {}
        : { keyResolver: init.keyResolver }),
    }).validate();
    this.entities = init.entities ?? [];
  }
}
