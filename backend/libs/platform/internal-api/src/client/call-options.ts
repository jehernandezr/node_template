import type { Deadline } from '@platform/primitives';

/** Valores de cada llamada. `idempotencyKey` es obligatorio. */
export interface CallOptions {
  readonly idempotencyKey: string;
  /**
   * `traceparent` W3C que se envía al servidor, que continúa esa traza. Por
   * defecto, el del span activo (`TraceContextRestorer.current()`).
   */
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /**
   * Presupuesto de toda la llamada, reintentos incluidos. Cada intento recibe
   * el tiempo de la operación recortado a lo que queda, y el tiempo restante
   * viaja al servidor como `CallMeta.deadline`. Por defecto, todos los intentos
   * más las esperas más largas (`OperationMetadata.callBudgetMs`).
   */
  readonly deadline?: Deadline;
  /**
   * Cancela la llamada. Un intento en vuelo termina como `uncertain` y no se
   * hace otro. El transporte recibe una señal que también se aborta.
   */
  readonly signal?: AbortSignal;
}
