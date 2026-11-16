import type { RetryPolicy } from '@platform/primitives';

/** Datos de una entrega que aporta el transporte. */
export interface DispatchOptions {
  /** Entregas hasta ahora, contando esta (1 en la primera). */
  readonly receiveCount: number;
  /**
   * Política de reintento de la cola. Por defecto, la de la cola del
   * consumidor en la topología del dispatcher. Sin ninguna de las dos, la
   * primera falla va a la cola de errores.
   */
  readonly retryPolicy?: RetryPolicy;
  /**
   * Visibility timeout vigente de esta entrega, en milisegundos. El lease del
   * claim nunca es más corto.
   */
  readonly visibilityTimeoutMs?: number;
  /**
   * Tenant de la suscripción por la que llegó la entrega. Si está, el
   * `tenantid` del sobre debe ser exactamente este. Manda sobre el
   * `expectedTenantId` del dispatcher.
   */
  readonly expectedTenantId?: string;
}
