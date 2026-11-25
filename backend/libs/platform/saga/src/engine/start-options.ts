import type { SagaCallContext } from '../model/saga-call-context.js';

/** Options of `SagaEngine.start` and `Sagas.start`. */
export interface StartOptions {
  /** Instance id, a UUID: the Postgres store saves it as `uuid`. Defaults to a new UUIDv7. */
  readonly sagaId?: string;
  /** Budget from the start. Once exceeded, the steps before the pivot are not dispatched and it compensates. */
  readonly deadlineMs?: number;
  /**
   * If an instance with this key already exists, it is returned instead of
   * starting another, as long as it has the same type and the same initial state
   * (compared with `SagaPayload.digest`); otherwise, `IdempotencyKeyConflict`.
   */
  readonly idempotencyKey?: string;
  /**
   * Tenant, actor and traceparent sent with each step. They are stored with the
   * instance, so a recovered step sends exactly the same values and
   * the participant builds the same idempotency key. Whatever is missing
   * comes from the current request (tenant and actor) and from the active span
   * (traceparent), so the saga continues on behalf of whoever started it.
   */
  readonly context?: SagaCallContext;
}
