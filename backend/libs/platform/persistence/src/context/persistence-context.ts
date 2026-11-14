import { type ActorType, RequestContext } from '@platform/observability';

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

/** Fuente del contexto. Se llama en cada sentencia, así que debe ser barata. */
export type PersistenceContextProvider = () => PersistenceContext;

/** Contexto vacío, para procesos sin petición (migraciones, jobs del catálogo). */
export const EMPTY_PERSISTENCE_CONTEXT: PersistenceContext = Object.freeze({});

/** Proveedor por defecto: copia los campos del `RequestContext` de observability. */
export const requestContextProvider: PersistenceContextProvider = () => {
  const ctx = RequestContext.current();
  if (ctx === undefined) {
    return EMPTY_PERSISTENCE_CONTEXT;
  }
  return {
    traceId: ctx.traceId,
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorType: ctx.actorType,
    userId: ctx.userId,
  };
};
