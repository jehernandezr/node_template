import type { StepDirection } from './step-direction.enum.js';
import type { StepStatus } from './step-status.enum.js';

/** Journal entry: one attempt of a step in one direction. */
export interface StepLogEntry {
  readonly sagaId: string;
  readonly stepIndex: number;
  readonly operationId: string;
  readonly direction: StepDirection;
  readonly status: StepStatus;
  /** `StepKey.of(sagaId, stepIndex, direction)`, the same on every attempt. */
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly errorCode: string | null;
  /**
   * W3C `traceparent` of the step, written with its dispatch. A retry of the
   * step, also from another node after a crash, runs in that trace. It is
   * `null` when there was no trace.
   */
  readonly traceparent: string | null;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
}
