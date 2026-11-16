import { RequestContextStore } from './request-context-store.js';
import type { RequestContextData } from './request-context-data.js';
import type { RequestContextInit } from './request-context-init.js';

/**
 * Acceso estático al contexto de petición.
 * @deprecated Inyecta `RequestContextStore`.
 */
export class RequestContext {
  static run<T>(init: RequestContextInit, fn: () => T): T {
    return RequestContextStore.shared().run(init, fn);
  }

  static current(): RequestContextData | undefined {
    return RequestContextStore.shared().current();
  }
}
