import type { StepStatus } from '../model/step-status.enum.js';

/** Entrada de un paso hacia delante, como la ven los constructores de entrada de compensación. */
export interface ForwardEntry {
  readonly input: unknown;
  readonly output: unknown;
  readonly idempotencyKey: string;
  readonly status: StepStatus;
}
