import type { SagaCallContext } from './saga-call-context.js';

/** Data with which `SagaInstance.start` creates a new instance. */
export interface StartSagaInstance {
  readonly id: string;
  readonly type: string;
  readonly idempotencyKey: string | null;
  /** Initial state already copied with `SagaPayload.clone`. */
  readonly state: unknown;
  readonly inputDigest: string;
  /** Saved without the `undefined` fields, or `null` if it ends up empty. */
  readonly context: SagaCallContext | undefined;
  /** Token of the run that starts the saga: it is born with the lease taken. */
  readonly leaseToken: string;
  readonly leaseUntil: Date;
  readonly deadlineAt: Date | null;
  readonly now: Date;
}
