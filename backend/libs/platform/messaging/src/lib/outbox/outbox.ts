import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { TargetKind } from '../topology/route.js';

/** Delivery state of an outbox record. */
export enum OutboxStatus {
  /** Never attempted. */
  Pending = 'pending',
  /** Published successfully. */
  Published = 'published',
  /** The last attempt failed; eligible again at `nextAttemptAt`. */
  Failed = 'failed',
  /** Given up: max attempts reached, unknown route, or payload too large. Kept for inspection. */
  Dead = 'dead',
}

/** An envelope waiting to be published. Written in the same transaction as the business change. */
export interface OutboxRecord {
  readonly id: string;
  readonly envelope: MessageEnvelope;
  readonly status: OutboxStatus;
  /** Relay passes that tried this record. */
  readonly attempts: number;
  readonly nextAttemptAt: Date;
  readonly createdAt: Date;
  /**
   * Ordering group (usually the aggregate id). Records of one group are published
   * in `createdAt` order, and FIFO targets receive it as the message group id.
   */
  readonly groupId?: string;
  readonly lastError?: string;
  readonly leaseOwner?: string;
  /** Fencing token of the current lease; changes on every claim. */
  readonly leaseToken?: string;
  readonly leaseExpiresAt?: Date;
}

/**
 * Lease held by one relay pass. `owner` identifies the relay instance and
 * `token` the claim; marks are applied only while both are still current.
 */
export interface OutboxLease {
  readonly owner: string;
  readonly token: string;
}

/** Arguments of {@link OutboxStore.claimPending}. */
export interface ClaimOutboxRequest {
  readonly now: Date;
  readonly limit: number;
  readonly lease: OutboxLease;
  /** Lease duration in milliseconds. */
  readonly leaseMs: number;
}

/** Destination of a published envelope, resolved from the topology. */
export interface OutboundTarget {
  readonly kind: TargetKind;
  readonly name: string;
}

/** Extra publishing hints. */
export interface PublishOutboxOptions {
  readonly groupId?: string;
}

/**
 * Port for outbox persistence.
 *
 * Fencing: every mark is conditional on the record still holding the given
 * lease (`leaseOwner = owner AND leaseToken = token`). A relay whose lease was
 * taken over cannot overwrite the new owner's state; the mark returns `false`.
 */
export interface OutboxStore {
  /**
   * Atomically leases up to `limit` due records, oldest `createdAt` first, and
   * stamps them with `lease` until `now + leaseMs`. A record is due when it is
   * Pending or Failed, `nextAttemptAt <= now` and it has no active lease.
   *
   * FIFO per `groupId`: once a Pending or Failed record of a group is not due
   * (scheduled later, or leased by someone else), no later record of that group
   * is returned. Published and Dead records do not block their group.
   */
  claimPending(request: ClaimOutboxRequest): Promise<OutboxRecord[]>;
  /** Marks one record published and clears its lease. `false` when the lease is no longer held. */
  markPublished(id: string, lease: OutboxLease): Promise<boolean>;
  /**
   * Stores the failure, increments `attempts`, schedules the next attempt and
   * clears the lease. `false` when the lease is no longer held.
   */
  markFailed(
    id: string,
    lease: OutboxLease,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean>;
  /** Stores a terminal failure, increments `attempts` and clears the lease. `false` when the lease is no longer held. */
  markDead(id: string, lease: OutboxLease, error: string): Promise<boolean>;
  /**
   * Clears the lease without counting an attempt, so the record is due again
   * right away. Used for records of a group that is blocked in this pass.
   * `false` when the lease is no longer held.
   */
  releaseLease(id: string, lease: OutboxLease): Promise<boolean>;
}

/** Port that sends one envelope to a topic or queue. */
export interface EnvelopePublisher {
  publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void>;
}
