import type { StepStatus } from '../model/step-status.enum.js';

/** Input of a forward step, as the compensation input builders see it. */
export interface ForwardEntry {
  readonly input: unknown;
  readonly output: unknown;
  readonly idempotencyKey: string;
  readonly status: StepStatus;
}
