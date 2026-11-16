import type { Deadline } from '@platform/primitives';
import type { SagaCallContext } from '../model/saga-call-context.js';

/** Valores por llamada que el motor entrega al invocador. */
export interface InvokeOptions {
  /** Aborta cuando se agota el presupuesto del paso. */
  readonly signal?: AbortSignal;
  /**
   * Presupuesto de este paso. El invocador lo pasa al cliente, que recorta
   * sus intentos a él y envía el resto al servidor como lease de idempotencia.
   */
  readonly deadline?: Deadline;
  /**
   * Contexto guardado con la instancia (tenant, actor, traceparent). Es el
   * mismo en cada intento y tras una recuperación, así el participante
   * construye igual su llave de idempotencia.
   */
  readonly context?: SagaCallContext;
}
