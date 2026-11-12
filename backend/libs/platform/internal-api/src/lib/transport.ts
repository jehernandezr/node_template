import type { CallOutcome } from '@platform/primitives';

/** Metadata propagated with every attempt. */
export interface CallMeta {
  readonly idempotencyKey: string;
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /** Milliseconds left for this attempt when it was sent. */
  readonly timeoutMs: number;
  /**
   * Epoch milliseconds after which the server must not start the work. It is
   * the attempt deadline, never later than the caller's `Deadline`. The server
   * derives the idempotency lease from it.
   */
  readonly deadline: number;
  /** Aborted when the attempt times out or the caller cancels. */
  readonly signal?: AbortSignal;
}

/** Port that moves a call to the server. The input is transmitted unchanged. */
export interface Transport {
  invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>>;
}
