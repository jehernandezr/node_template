import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { TargetKind } from '../topology/target-kind.enum.js';

/** Delivery status of an outbox record. */
export enum OutboxStatus {
  /** Never attempted. */
  Pending = 'pending',
  /** Published successfully. */
  Published = 'published',
  /** The last attempt failed; it becomes eligible again at `nextAttemptAt`. */
  Failed = 'failed',
  /** Abandoned: the maximum attempts were reached, there is no route or the payload is too large. Kept for inspection. */
  Dead = 'dead',
}

/** Envelope pending publication. Written in the same transaction as the business change. */
export interface OutboxRecord {
  readonly id: string;
  readonly envelope: MessageEnvelope;
  readonly status: OutboxStatus;
  /** Relay passes that attempted this record. */
  readonly attempts: number;
  readonly nextAttemptAt: Date;
  readonly createdAt: Date;
  /**
   * Ordering group (usually the aggregate id). The records of a group are
   * published in `createdAt` order, and FIFO destinations receive it as the group id.
   */
  readonly groupId?: string;
  /**
   * Delivery delay of a command, counted from `createdAt`. The relay passes to the
   * transport what remains of it.
   */
  readonly delayMs?: number;
  readonly lastError?: string;
  readonly leaseOwner?: string;
  /** Fencing token of the current lease; changes on each claim. */
  readonly leaseToken?: string;
  readonly leaseExpiresAt?: Date;
}

/**
 * Lease held by a relay pass. `owner` identifies the relay instance
 * and `token` the claim; marks apply only while both are still valid.
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
  /** FIFO topic or queue: the transport sends `groupId` as `MessageGroupId`. */
  readonly fifo?: boolean;
}

/** Extra publication hints. */
export interface PublishOutboxOptions {
  readonly groupId?: string;
  /** Wait before a command is visible in its queue. */
  readonly delayMs?: number;
}

/** Record added to the outbox together with the business change. */
export interface OutboxAppend {
  readonly envelope: MessageEnvelope;
  readonly groupId?: string;
  readonly delayMs?: number;
  /** Creation time and first due time. */
  readonly createdAt: Date;
}

/** Options of {@link OutboxStore.purge}. */
export interface PurgeOutboxOptions {
  /** Deletes what finished before this instant. */
  readonly before: Date;
  /** Also deletes the dead ones. By default they are kept for inspection. */
  readonly includeDead?: boolean;
}
