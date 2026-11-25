/**
 * Context of the calls of a saga, saved with the instance. Every
 * attempt of every step, also after a recovery, sends the same
 * values, so the participant builds its idempotency key the same way.
 */
export interface SagaCallContext {
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly traceparent?: string;
}
