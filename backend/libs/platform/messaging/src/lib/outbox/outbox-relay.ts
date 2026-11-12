import {
  type Clock,
  type IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { validateBackoffOptions } from '@platform/primitives';
import { describeError } from '../errors/describe-error.js';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';
import {
  MAX_ENVELOPE_BYTES,
  envelopeSizeBytes,
} from '../envelope/message-envelope.js';
import {
  type MessagingBackoffOptions,
  messagingBackoffDelay,
  toSharedBackoff,
} from '../topology/retry-policy.js';
import type { Topology } from '../topology/topology.js';
import type {
  EnvelopePublisher,
  OutboundTarget,
  OutboxLease,
  OutboxRecord,
  OutboxStore,
} from './outbox.js';

/** Dependencies and tuning of the relay. */
export interface OutboxRelayOptions {
  readonly store: OutboxStore;
  readonly publisher: EnvelopePublisher;
  readonly topology: Topology;
  /**
   * Backoff applied between failed attempts: `BackoffOptions` of
   * `@platform/primitives`, or the deprecated `{ baseMs, maxMs, jitter }` shape.
   */
  readonly backoff: MessagingBackoffOptions;
  /** Records leased per pass. Defaults to 100. */
  readonly batchSize?: number;
  /** Attempts before a record is marked Dead. Defaults to 10. */
  readonly maxAttempts?: number;
  /**
   * Label of the lease owner. Each relay instance appends its own id from `ids`,
   * so replicas never share an owner. Defaults to `outbox-relay`.
   */
  readonly owner?: string;
  /** Lease duration in milliseconds. Defaults to 30 seconds. */
  readonly leaseMs?: number;
  /** Source of time. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Source of the instance id and of the per-pass lease tokens. Defaults to UUIDv7. */
  readonly ids?: IdGenerator;
}

/** Counts of one {@link OutboxRelay.relayOnce} pass. */
export interface RelayReport {
  readonly claimed: number;
  readonly published: number;
  /** Failed attempts that were rescheduled. */
  readonly failed: number;
  /** Records given up on in this pass. */
  readonly dead: number;
  /**
   * Records not published because an older record of their group failed or
   * was lost in this pass. Their lease is released; order is kept.
   */
  readonly deferred: number;
  /**
   * Records whose lease was lost (expired before publishing, or a mark was
   * rejected because another relay took the record over).
   */
  readonly stale: number;
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_OWNER = 'outbox-relay';
const DEFAULT_LEASE_MS = 30_000;

function assertPositiveInteger(name: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
    throw new MessagingError(
      MessagingErrorCode.InvalidOptions,
      `${name} must be an integer >= 1`,
    );
  }
}

/**
 * Publishes due outbox records, one at a time and in `createdAt` order. Each
 * record is marked right after its publish. Delivery is at-least-once: a crash
 * between publish and mark can duplicate a message, which idempotent consumers absorb.
 *
 * Fencing: each relay instance has its own owner id, and each pass leases its
 * records with a fresh token. Marks only apply while that lease is current, and
 * a record whose lease has already expired is not published.
 *
 * FIFO per `groupId`: when a record of a group fails (or its lease is lost), the
 * later records of that group are not published in that pass; their lease is
 * released so they keep their place behind the failed one.
 */
export class OutboxRelay {
  /** Lease owner of this relay instance: `<owner label>:<instance id>`. */
  readonly ownerId: string;

  private readonly options: OutboxRelayOptions;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(options: OutboxRelayOptions) {
    options.topology.assertValid();
    validateBackoffOptions(toSharedBackoff(options.backoff));
    assertPositiveInteger('batchSize', options.batchSize);
    assertPositiveInteger('maxAttempts', options.maxAttempts);
    assertPositiveInteger('leaseMs', options.leaseMs);
    this.options = options;
    this.clock = options.clock ?? new SystemClock();
    this.ids = options.ids ?? new UuidV7IdGenerator();
    this.ownerId = `${options.owner ?? DEFAULT_OWNER}:${this.ids.next().toString()}`;
  }

  /**
   * Runs one pass over the records due now.
   * @param now Deprecated: pass a `clock` in the options instead. When given, it
   *   is the pass start time, and lease expiry is measured from it with the clock.
   */
  async relayOnce(now?: Date): Promise<RelayReport> {
    const { store, publisher } = this.options;
    const startedAt = this.clock.now().getTime();
    const passStart = now?.getTime() ?? startedAt;
    const current = (): number =>
      passStart + (this.clock.now().getTime() - startedAt);

    const lease: OutboxLease = {
      owner: this.ownerId,
      token: this.ids.next().toString(),
    };
    const records = await store.claimPending({
      now: new Date(passStart),
      limit: this.options.batchSize ?? DEFAULT_BATCH_SIZE,
      lease,
      leaseMs: this.options.leaseMs ?? DEFAULT_LEASE_MS,
    });
    const maxAttempts = this.options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    const blockedGroups = new Set<string>();
    const block = (record: OutboxRecord): void => {
      if (record.groupId !== undefined) blockedGroups.add(record.groupId);
    };
    let published = 0;
    let failed = 0;
    let dead = 0;
    let deferred = 0;
    let stale = 0;

    for (const record of records) {
      if (record.groupId !== undefined && blockedGroups.has(record.groupId)) {
        if (await store.releaseLease(record.id, lease)) deferred++;
        else stale++;
        continue;
      }

      const target = this.targetFor(record);
      if (typeof target === 'string') {
        // Dead records do not block their group.
        if (await store.markDead(record.id, lease, target)) dead++;
        else {
          stale++;
          block(record);
        }
        continue;
      }

      const expiresAt = record.leaseExpiresAt?.getTime();
      if (expiresAt !== undefined && current() >= expiresAt) {
        // Another relay may own it now: publishing could reorder the group.
        stale++;
        block(record);
        continue;
      }

      try {
        await publisher.publish(record.envelope, target, {
          groupId: record.groupId,
        });
      } catch (err) {
        const message = describeError(err);
        if (record.attempts + 1 >= maxAttempts) {
          if (await store.markDead(record.id, lease, message)) dead++;
          else {
            stale++;
            block(record);
          }
        } else {
          const delay = messagingBackoffDelay(
            record.attempts + 1,
            this.options.backoff,
          );
          const marked = await store.markFailed(
            record.id,
            lease,
            message,
            new Date(passStart + delay),
          );
          if (marked) failed++;
          else stale++;
          block(record);
        }
        continue;
      }

      if (await store.markPublished(record.id, lease)) published++;
      else {
        stale++;
        block(record);
      }
    }

    return {
      claimed: records.length,
      published,
      failed,
      dead,
      deferred,
      stale,
    };
  }

  /** Resolves the destination, or returns the reason the record is permanently undeliverable. */
  private targetFor(record: OutboxRecord): OutboundTarget | string {
    const route = this.options.topology.routeFor(record.envelope.type);
    if (!route) return `no route for type "${record.envelope.type}"`;
    const size = envelopeSizeBytes(record.envelope);
    if (size > MAX_ENVELOPE_BYTES)
      return `payload is ${size} bytes, limit is ${MAX_ENVELOPE_BYTES}`;
    return { kind: route.targetKind, name: route.target.name };
  }
}
