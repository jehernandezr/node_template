import type { RequestContextStore } from '@platform/observability';
import { PersistenceContextProvider } from './persistence-context-provider.js';
import type { PersistenceContext } from './persistence-context.js';

/** Toma el contexto del `RequestContextStore` de observability. */
export class RequestPersistenceContextProvider extends PersistenceContextProvider {
  private static readonly EMPTY: PersistenceContext = Object.freeze({});

  constructor(private readonly store: RequestContextStore) {
    super();
  }

  current(): PersistenceContext {
    const data = this.store.current();
    if (data === undefined) {
      return RequestPersistenceContextProvider.EMPTY;
    }
    return {
      traceId: data.traceId,
      tenantId: data.tenantId,
      actorId: data.actorId,
      actorType: data.actorType,
      userId: data.userId,
    };
  }
}
