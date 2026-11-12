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
  /** Aggregate id, passed to the publisher so FIFO targets keep per-aggregate order. */
  readonly groupId?: string;
  readonly lastError?: string;
  readonly leaseOwner?: string;
  readonly leaseExpiresAt?: Date;
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

/** Port for outbox persistence. */
export interface OutboxStore {
  /**
   * Atomically leases up to `limit` due records (Pending or Failed, `nextAttemptAt <= now`,
   * no active lease), oldest `createdAt` first. The lease expires after `leaseMs`.
   */
  claimPending(
    now: Date,
    limit: number,
    owner: string,
    leaseMs: number,
  ): Promise<OutboxRecord[]>;
  /** Marks one record published and releases its lease. */
  markPublished(id: string): Promise<void>;
  /** Stores the failure, increments `attempts`, schedules the next attempt and releases the lease. */
  markFailed(id: string, error: string, nextAttemptAt: Date): Promise<void>;
  /** Stores a terminal failure, increments `attempts` and releases the lease. */
  markDead(id: string, error: string): Promise<void>;
}

/** Port that sends one envelope to a topic or queue. */
export interface EnvelopePublisher {
  publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void>;
}
