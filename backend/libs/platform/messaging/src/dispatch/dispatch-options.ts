import type { RetryPolicy } from '@platform/primitives';

/** Delivery data provided by the transport. */
export interface DispatchOptions {
  /** Deliveries so far, counting this one (1 on the first). */
  readonly receiveCount: number;
  /**
   * Retry policy of the queue. Defaults to the one of the consumer
   * queue in the dispatcher topology. Without either, the
   * first failure goes to the dead-letter queue.
   */
  readonly retryPolicy?: RetryPolicy;
  /**
   * Current visibility timeout of this delivery, in milliseconds. The claim
   * lease is never shorter.
   */
  readonly visibilityTimeoutMs?: number;
  /**
   * Tenant of the subscription the delivery arrived through. If present, the
   * envelope `tenantid` must be exactly this one. Takes precedence over the
   * dispatcher `expectedTenantId`.
   */
  readonly expectedTenantId?: string;
}
