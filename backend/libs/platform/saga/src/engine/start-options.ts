import type { SagaCallContext } from '../model/saga-call-context.js';

/** Opciones de `SagaEngine.start` y de `Sagas.start`. */
export interface StartOptions {
  /** Id de la instancia, un UUID: el almacén de Postgres lo guarda como `uuid`. Por defecto, un UUIDv7 nuevo. */
  readonly sagaId?: string;
  /** Presupuesto desde el arranque. Pasado, los pasos anteriores al pivote no se despachan y se compensa. */
  readonly deadlineMs?: number;
  /**
   * Si ya existe una instancia con esta llave, se devuelve en lugar de
   * arrancar otra, siempre que tenga el mismo tipo y el mismo estado inicial
   * (comparado con `SagaPayload.digest`); si no, `IdempotencyKeyConflict`.
   */
  readonly idempotencyKey?: string;
  /**
   * Tenant, actor y traceparent que se envían con cada paso. Se guardan con la
   * instancia, así un paso recuperado envía exactamente los mismos valores y
   * el participante construye la misma llave de idempotencia. Lo que falta
   * sale de la petición en curso (tenant y actor) y del span activo
   * (traceparent), así la saga continúa a quien la arrancó.
   */
  readonly context?: SagaCallContext;
}
