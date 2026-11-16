import type { ShardAccess } from '@platform/sharding';
import type { PersistenceFeature } from '../persistence-feature.js';

/** Qué se quiere resolver: la declaración de sharding del módulo y la intención de acceso. */
export interface ShardRequest {
  readonly feature: PersistenceFeature;
  /** Entidad, criterio o petición que el `ShardKeyResolver` del módulo lee con `ShardKey.Custom`. */
  readonly source?: unknown;
  readonly access: ShardAccess;
}
