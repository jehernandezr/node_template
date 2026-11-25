import type { Deadline } from '@platform/primitives';
import type { SagaCallContext } from '../model/saga-call-context.js';

/** Per-call values that the engine hands to the invoker. */
export interface InvokeOptions {
  /** Aborts when the step budget runs out. */
  readonly signal?: AbortSignal;
  /**
   * Budget of this step. The invoker passes it to the client, which trims
   * its attempts to it and sends the remainder to the server as the idempotency lease.
   */
  readonly deadline?: Deadline;
  /**
   * Context saved with the instance (tenant, actor, traceparent). It is the
   * same on every attempt and after a recovery, so the participant
   * builds its idempotency key the same way.
   */
  readonly context?: SagaCallContext;
}
