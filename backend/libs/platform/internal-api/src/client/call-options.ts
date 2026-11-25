import type { Deadline } from '@platform/primitives';

/** Per-call values. `idempotencyKey` is required. */
export interface CallOptions {
  readonly idempotencyKey: string;
  /**
   * W3C `traceparent` sent to the server, which continues that trace. By
   * default, the one of the active span (`TraceContextRestorer.current()`).
   */
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /**
   * Budget for the whole call, retries included. Each attempt receives
   * the operation time trimmed to what remains, and the remaining time
   * travels to the server as `CallMeta.deadline`. By default, all attempts
   * plus the longest waits (`OperationMetadata.callBudgetMs`).
   */
  readonly deadline?: Deadline;
  /**
   * Cancels the call. An attempt in flight ends as `uncertain` and no other
   * is made. The transport receives a signal that is also aborted.
   */
  readonly signal?: AbortSignal;
}
