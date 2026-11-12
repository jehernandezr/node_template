import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextData {
  traceId: string;
  spanId: string;
  tenantId?: string;
  userId?: string;
  debugSampled: boolean;
}

const storage = new AsyncLocalStorage<RequestContextData>();

/** Per-request context propagated through async calls via AsyncLocalStorage. */
export class RequestContext {
  static run<T>(context: RequestContextData, fn: () => T): T {
    return storage.run(context, fn);
  }

  static current(): RequestContextData | undefined {
    return storage.getStore();
  }
}
