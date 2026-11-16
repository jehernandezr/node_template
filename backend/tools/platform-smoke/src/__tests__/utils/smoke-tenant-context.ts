import { ActorType, type RequestContextStore } from '@platform/observability';

/**
 * Abre el contexto de petición de un tenant en el `RequestContextStore` de la app, como lo haría el
 * middleware HTTP o el consumidor de un mensaje.
 */
export class SmokeTenantContext {
  constructor(private readonly store: RequestContextStore) {}

  /** Ejecuta `fn` como una petición del tenant dado, con la traza y el actor que pide el contexto. */
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
