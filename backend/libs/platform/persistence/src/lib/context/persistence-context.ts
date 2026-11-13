import {
  RequestContext,
  type RequestContextData,
} from '@platform/observability';

/** Datos de la petición que la capa lleva a cada sentencia y a la auditoría. */
export interface PersistenceContext {
  readonly traceId?: string;
  readonly tenantId?: string;
  /** Quién hace el cambio: usuario, API key o sistema. */
  readonly actorId?: string;
  /** Tipo de actor, por ejemplo `user`, `api-key` o `system`. */
  readonly actorType?: string;
}

/** Fuente del contexto. Se llama en cada sentencia, así que debe ser barata. */
export type PersistenceContextProvider = () => PersistenceContext;

/** Contexto vacío, para procesos sin petición (migraciones, jobs del catálogo). */
export const EMPTY_PERSISTENCE_CONTEXT: PersistenceContext = Object.freeze({});

/**
 * Campos que `RequestContext` puede traer además de los actuales. Se leen si
 * existen, así el proveedor sigue funcionando cuando observability los agregue.
 */
type ExtendedRequestContext = RequestContextData &
  Partial<Readonly<{ actorId: string; actorType: string }>>;

/**
 * Proveedor por defecto: toma `traceId` y `tenantId` del `RequestContext` de
 * observability. El actor es `actorId` si existe y, si no, `userId`.
 */
export const requestContextProvider: PersistenceContextProvider = () => {
  const ctx: ExtendedRequestContext | undefined = RequestContext.current();
  if (ctx === undefined) {
    return EMPTY_PERSISTENCE_CONTEXT;
  }
  return {
    traceId: ctx.traceId,
    tenantId: ctx.tenantId,
    actorId: ctx.actorId ?? ctx.userId,
    actorType: ctx.actorType,
  };
};
