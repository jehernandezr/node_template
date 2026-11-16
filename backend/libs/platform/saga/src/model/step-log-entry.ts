import type { StepDirection } from './step-direction.enum.js';
import type { StepStatus } from './step-status.enum.js';

/** Entrada de la bitácora: un intento de un paso en una dirección. */
export interface StepLogEntry {
  readonly sagaId: string;
  readonly stepIndex: number;
  readonly operationId: string;
  readonly direction: StepDirection;
  readonly status: StepStatus;
  /** `StepKey.of(sagaId, stepIndex, direction)`, la misma en cada intento. */
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly errorCode: string | null;
  /**
   * `traceparent` W3C del paso, escrito con su despacho. Un reintento del
   * paso, también desde otro nodo tras una caída, corre en esa traza. Es
   * `null` cuando no había traza.
   */
  readonly traceparent: string | null;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
}
