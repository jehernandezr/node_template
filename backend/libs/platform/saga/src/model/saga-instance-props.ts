import type { SagaCallContext } from './saga-call-context.js';
import type { SagaStatus } from './saga-status.enum.js';
import type { StepDirection } from './step-direction.enum.js';

/** Persistent fields of a saga instance: what the `SagaStore` saves and returns. */
export interface SagaInstanceProps {
  readonly id: string;
  readonly type: string;
  readonly idempotencyKey: string | null;
  readonly status: SagaStatus;
  readonly state: unknown;
  /** Index of the step being executed (forward) or compensated. */
  readonly currentStep: number;
  readonly direction: StepDirection;
  /** Optimistic concurrency version; the store bumps it on every guarded write. */
  readonly version: number;
  /** Token of the run that holds the lease, or `null`. */
  readonly leaseToken: string | null;
  readonly leaseUntil: Date | null;
  readonly nextAttemptAt: Date | null;
  /** Consecutive failed attempts of the current step. */
  readonly attempts: number;
  /** When the current suspension period started. */
  readonly suspendedSince: Date | null;
  readonly deadlineAt: Date | null;
  readonly lastErrorCode: string | null;
  /**
   * What failed besides the code, for whoever handles an intervention: the
   * reason of the call result, or the name and message of the error that
   * a step builder threw. Never the input or the state. It is cleared
   * when a step succeeds.
   */
  readonly lastErrorDetail: string | null;
  /** Context of the calls (tenant, actor, traceparent), or `null` if none was given. */
  readonly context: SagaCallContext | null;
  /**
   * Fingerprint (`SagaPayload.digest`) of the initial state. An idempotent start
   * with the same key and different input is rejected.
   */
  readonly inputDigest: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
