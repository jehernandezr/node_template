import type { Clock, RandomSource } from '@platform/kernel';
import type { Tracing, TraceContextRestorer } from '@platform/observability';
import type { FailureClassifier } from '@platform/primitives';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { Topology } from '../topology/topology.js';
import type { PermanenceCheck } from './delivery-classifier.js';
import type { ProcessedMessageStore } from './processed-message-store.js';
import type { TenantVerifier } from './tenant-verifier.js';

/** Dependencies and rules of the dispatcher. */
export interface MessageDispatcherOptions {
  /** Consumer name, usually the queue. The idempotency key is `(consumer, id)`. */
  readonly consumer: string;
  readonly processed: ProcessedMessageStore;
  /** Tells the kind of a message without a handler: an event is ignored, a command goes to the dead-letter queue. */
  readonly topology?: Topology;
  /**
   * Permanence rule for the errors a handler throws. Defaults to
   * the one of `FailureClassifier` (see `DeliveryClassifier.disposition`).
   */
  readonly isPermanent?: PermanenceCheck;
  /** Wraps the claim and the handler, for example to open a transaction or a tenant context. */
  readonly runInContext?: (
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ) => Promise<void>;
  /** Time source for the leases. */
  readonly clock: Clock;
  /**
   * Minimum claim lease in milliseconds, a positive integer. It must cover the
   * queue visibility timeout. Defaults to the visibility timeout of the
   * consumer queue in `topology` or `ClaimGuard.DEFAULT_LEASE_MS`.
   */
  readonly minLeaseMs?: number;
  /** Extra margin over `minLeaseMs`. Defaults to the one in `ClaimRules`. */
  readonly leaseMarginMs?: number;
  /** Tenant this consumer serves (single-tenant queue). See `DispatchOptions.expectedTenantId`. */
  readonly expectedTenantId?: string;
  /** Verifies the envelope tenant before running the handler. */
  readonly verifyTenant?: TenantVerifier;
}

/** Collaborators of the dispatcher. All are required; the caller provides each one. */
export interface MessageDispatcherParts {
  /** Consumer spans. */
  readonly tracing: Tracing;
  /** Continues the trace of the envelope `traceparent`. */
  readonly restorer: TraceContextRestorer;
  /** Source of the retry wait jitter. */
  readonly random: RandomSource;
  /** Decides which handler failures are transient. */
  readonly failures: FailureClassifier;
}
