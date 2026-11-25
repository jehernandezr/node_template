import {
  type Clock,
  ErrorDescriptor,
  type IdGenerator,
  type RandomSource,
} from '@platform/kernel';
import { Backoff, type RetryPolicy } from '@platform/primitives';
import { ResilienceErrorCode } from '@platform/resilience';
import { MessagingGuard } from '../errors/messaging-guard.js';
import { EnvelopeValidator } from '../envelope/envelope-validator.js';
import type { Topology } from '../topology/topology.js';
import type { OutboundTarget, OutboxLease, OutboxRecord } from './outbox.js';
import { EnvelopeLimits } from '../envelope/envelope-limits.js';
import { type EnvelopePublisher } from './envelope-publisher.js';
import { type OutboxStore } from './outbox-store.js';

/** Dependencies and settings of the relay. */
export interface OutboxRelayOptions {
  readonly store: OutboxStore;
  readonly publisher: EnvelopePublisher;
  readonly topology: Topology;
  /**
   * Wait between failed attempts, capped at `maxMs`. A transport failure
   * never exhausts the attempts: the record is retried until the destination
   * comes back.
   */
  readonly retryPolicy: RetryPolicy;
  /** Records taken with a lease per pass. Defaults to 100. */
  readonly batchSize?: number;
  /**
   * Label of the lease owner. Each relay instance appends its own id
   * taken from `ids`, so replicas never share an owner. Defaults to
   * `outbox-relay`.
   */
  readonly owner?: string;
  /** Lease duration in milliseconds. Defaults to 30 seconds. */
  readonly leaseMs?: number;
  /** Time source. */
  readonly clock: Clock;
  /** Source of the instance id and of the lease tokens of each pass. */
  readonly ids: IdGenerator;
  /** Source of the jitter of the wait between attempts. */
  readonly random: RandomSource;
}

/** Counts of one pass of {@link OutboxRelay.relayOnce}. */
export interface RelayReport {
  readonly claimed: number;
  readonly published: number;
  /** Failed attempts that were rescheduled. */
  readonly failed: number;
  /** Records that can never be delivered (no route, too large or out of contract), declared dead. */
  readonly dead: number;
  /**
   * Records not published because an earlier record of their group
   * failed or was lost in this pass. Their lease is released and the order is kept.
   */
  readonly deferred: number;
  /**
   * Records whose lease was lost (it expired before publishing, or a mark was
   * rejected because another relay took the record).
   */
  readonly stale: number;
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_OWNER = 'outbox-relay';
const DEFAULT_LEASE_MS = 30_000;

/**
 * Publishes the outbox records that are already due, one by one and in
 * `createdAt` order. Each record is marked right after its publication. Delivery
 * is at least once: a crash between the publication and the mark can
 * duplicate a message, which idempotent consumers absorb.
 *
 * Fencing: each relay instance has its own owner id, and each pass
 * takes its records with a new token. Marks only apply while that
 * lease is still valid, and a record whose lease already expired is not published.
 *
 * FIFO per `groupId`: when a record of a group fails (or its lease is
 * lost), the later records of that group are not published in that pass;
 * their lease is released so they keep their place behind the failed one.
 *
 * `Dead` is reserved for what can never be delivered. A transport failure is
 * retried without limit with the `retryPolicy` wait, and the rejection of an
 * open circuit breaker does not even count as an attempt: the record releases its
 * lease and waits for the next pass. A `Dead` record does not block its
 * group: it will never be delivered and would stall the ones behind it forever. A
 * record whose lease expired is not published, because another relay may hold it and
 * publishing it would put the group out of order.
 */
export class OutboxRelay {
  /** Lease owner of this relay instance: `<label>:<instance id>`. */
  readonly ownerId: string;

  private readonly options: OutboxRelayOptions;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly backoff: Backoff;
  private readonly validator = new EnvelopeValidator();

  constructor(options: OutboxRelayOptions) {
    options.topology.assertValid();
    const guard = MessagingGuard.instance;
    if (options.batchSize !== undefined) {
      guard.positiveInteger('batchSize', options.batchSize);
    }
    if (options.leaseMs !== undefined) {
      guard.positiveInteger('leaseMs', options.leaseMs);
    }
    this.backoff = new Backoff(options.retryPolicy, options.random);
    this.options = options;
    this.clock = options.clock;
    this.ids = options.ids;
    this.ownerId = `${options.owner ?? DEFAULT_OWNER}:${this.ids.next().toString()}`;
  }

  /** Runs one pass over the records due at this time. */
  async relayOnce(): Promise<RelayReport> {
    const { store, publisher } = this.options;
    const passStart = this.clock.now().getTime();
    const current = (): number => this.clock.now().getTime();

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
        if (await store.markDead(record.id, lease, target)) dead++;
        else {
          stale++;
          block(record);
        }
        continue;
      }

      const expiresAt = record.leaseExpiresAt?.getTime();
      if (expiresAt !== undefined && current() >= expiresAt) {
        stale++;
        block(record);
        continue;
      }

      const delayMs = this.remainingDelay(record, current());
      try {
        await publisher.publish(record.envelope, target, {
          groupId: record.groupId,
          ...(delayMs > 0 ? { delayMs } : {}),
        });
      } catch (err) {
        if (ErrorDescriptor.codeOf(err) === ResilienceErrorCode.CircuitOpen) {
          if (await store.releaseLease(record.id, lease)) deferred++;
          else stale++;
          block(record);
          continue;
        }
        const message = ErrorDescriptor.describe(err).message;
        const delay = this.backoff.delay(
          Math.min(record.attempts + 1, Backoff.MAX_ATTEMPT),
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

  /** What remains of a command's delay, counted from the record creation. */
  private remainingDelay(record: OutboxRecord, now: number): number {
    if (!record.delayMs) return 0;
    return Math.max(0, record.createdAt.getTime() + record.delayMs - now);
  }

  /**
   * Resolves the destination, or returns the reason why the record can never
   * be delivered: there is no route, the envelope exceeds the size limit, the payload
   * breaks the route contract (it would die in the DLQ of every consumer) or
   * the destination is FIFO and the record has no group id.
   */
  private targetFor(record: OutboxRecord): OutboundTarget | string {
    const { type } = record.envelope;
    const route = this.options.topology.routeFor(type);
    if (!route) return `no route for type "${type}"`;
    const size = this.validator.sizeBytes(record.envelope);
    if (size > EnvelopeLimits.MAX_BYTES)
      return `payload is ${size} bytes, limit is ${EnvelopeLimits.MAX_BYTES}`;
    if (!route.contract) return `route "${type}" has no contract`;
    const parsed = route.contract.schema.safeParse(record.envelope.data);
    if (!parsed.success) {
      return `invalid payload for "${type}": ${parsed.error.message}`;
    }
    if (route.fifo && record.groupId === undefined) {
      return `"${type}" goes to a FIFO ${route.targetKind} and the record has no groupId`;
    }
    return {
      kind: route.targetKind,
      name: route.target.name,
      fifo: route.fifo,
    };
  }
}
