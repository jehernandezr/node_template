import { ActorType, type RequestContextStore } from '@platform/observability';

/**
 * Opens a tenant's request context in the app's `RequestContextStore`, as the
 * HTTP middleware or a message consumer would.
 */
export class SmokeTenantContext {
  constructor(private readonly store: RequestContextStore) {}

  /** Runs `fn` as a request of the given tenant, with the trace and actor the context requires. */
  runAs<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.store.run(
      {
        tenantId,
        actorId: 'smoke-actor',
        actorType: ActorType.User,
        traceId: '0193f1c2-0000-7000-8000-00000000c0de',
        spanId: '00f067aa0ba902b7',
        debugSampled: false,
      },
      fn,
    );
  }
}
