import {
  ShardingFeature,
  ShardStrategy,
  type ShardKey,
  type ShardKeyResolver,
} from '@platform/sharding';
import type { EntityClass } from './metadata/entity-metadata.js';

/** Datos para armar un {@link PersistenceFeature}. */
export interface PersistenceFeatureInit {
  readonly key: ShardKey;
  readonly strategy?: ShardStrategy;
  readonly keyResolver?: ShardKeyResolver;
  readonly entities?: readonly EntityClass[];
}

/**
 * Declaración de sharding de un módulo ya validada, con las entidades que registra.
 * `PersistenceModule.forFeature` la crea y la inyecta en los repositorios del módulo.
 */
export class PersistenceFeature {
  readonly sharding: ShardingFeature;
  readonly entities: readonly EntityClass[];

  /** @throws ShardingError `InvalidConfiguration` si la declaración de sharding no es válida. */
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
