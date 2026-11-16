import type { ActorType } from '@platform/observability';

/** Datos de la petición que la capa lleva a cada sentencia y a la auditoría. */
export interface PersistenceContext {
  readonly traceId?: string;
  readonly tenantId?: string;
  /** Quién hace el cambio: usuario, cuenta de servicio, API key o sistema. Va a la auditoría. */
  readonly actorId?: string;
  readonly actorType?: ActorType;
  /**
   * Usuario sobre el que se opera. Es la llave de `ShardKey.User`: una cuenta
   * de servicio o una saga que actúa sobre un usuario debe llegar a su shard,
   * no al del actor.
   */
  readonly userId?: string;
}
