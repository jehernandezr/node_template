import type { OperationResult } from './result.js';

/** Metadata propagated with every call. */
export interface CallMeta {
  readonly idempotencyKey: string;
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /** Budget for a single attempt, set by the client. */
  readonly timeoutMs: number;
  /** Epoch milliseconds after which the server must not start the work. */
  readonly deadline: number;
  /** Aborted by the client when the attempt times out. */
  readonly signal?: AbortSignal;
}

/** Port that moves a call to the server. The input is transmitted unchanged. */
export interface Transport {
  invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<OperationResult<unknown>>;
}
