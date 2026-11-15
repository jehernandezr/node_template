import { RequestContext } from '@platform/observability';
import type { PersistenceContext } from '../../context/persistence-context.js';

/** Fuente del contexto. Se llama en cada sentencia, así que debe ser barata. */
export type LegacyContextProvider = () => PersistenceContext;

/** Contexto vacío, para procesos sin petición (migraciones, jobs del catálogo). */
export const EMPTY_PERSISTENCE_CONTEXT: PersistenceContext = Object.freeze({});

/** Proveedor por defecto: copia los campos del `RequestContext` de observability. */
export class LegacyRequestContext {
  static readonly provider: LegacyContextProvider = () => {
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
}
