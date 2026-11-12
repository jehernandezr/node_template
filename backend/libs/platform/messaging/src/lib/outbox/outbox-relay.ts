import { describeError } from '../errors/describe-error.js';
import {
  MAX_ENVELOPE_BYTES,
  envelopeSizeBytes,
} from '../envelope/message-envelope.js';
import {
  type BackoffOptions,
  backoffDelayMs,
} from '../topology/retry-policy.js';
import type { Topology } from '../topology/topology.js';
import type {
  EnvelopePublisher,
  OutboundTarget,
  OutboxRecord,
  OutboxStore,
} from './outbox.js';

/** Dependencies and tuning of the relay. */
export interface OutboxRelayOptions {
  readonly store: OutboxStore;
  readonly publisher: EnvelopePublisher;
  readonly topology: Topology;
  /** Backoff applied between failed attempts. */
  readonly backoff: BackoffOptions;
  /** Records leased per pass. Defaults to 100. */
  readonly batchSize?: number;
  /** Attempts before a record is marked Dead. Defaults to 10. */
  readonly maxAttempts?: number;
  /** Lease owner name. Defaults to `outbox-relay`. */
  readonly owner?: string;
  /** Lease duration in milliseconds. Defaults to 30 seconds. */
  readonly leaseMs?: number;
}

/** Counts of one {@link OutboxRelay.relayOnce} pass. */
export interface RelayReport {
  readonly claimed: number;
  readonly published: number;
  /** Failed attempts that were rescheduled. */
  readonly failed: number;
  /** Records given up on in this pass. */
  readonly dead: number;
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_OWNER = 'outbox-relay';
const DEFAULT_LEASE_MS = 30_000;

/**
 * Publishes due outbox records, one at a time. Each record is marked published right after
 * its publish succeeds. Delivery is at-least-once: a crash between publish and mark can
 * duplicate a message, which idempotent consumers absorb.
 */
export class OutboxRelay {
  private readonly options: OutboxRelayOptions;

  constructor(options: OutboxRelayOptions) {
    options.topology.assertValid();
    this.options = options;
  }

  /** Runs one pass over the records due at `now`. */
  async relayOnce(now: Date = new Date()): Promise<RelayReport> {
    const { store, publisher, backoff } = this.options;
    const records = await store.claimPending(
      now,
      this.options.batchSize ?? DEFAULT_BATCH_SIZE,
      this.options.owner ?? DEFAULT_OWNER,
      this.options.leaseMs ?? DEFAULT_LEASE_MS,
    );
    const maxAttempts = this.options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    let published = 0;
    let failed = 0;
    let dead = 0;

    for (const record of records) {
      const target = this.targetFor(record);
      if (typeof target === 'string') {
        await store.markDead(record.id, target);
        dead++;
        continue;
      }

      try {
        await publisher.publish(record.envelope, target, {
          groupId: record.groupId,
        });
      } catch (err) {
        const message = describeError(err);
        if (record.attempts + 1 >= maxAttempts) {
          await store.markDead(record.id, message);
          dead++;
        } else {
          const nextAttemptAt = new Date(
            now.getTime() + backoffDelayMs(record.attempts + 1, backoff),
          );
          await store.markFailed(record.id, message, nextAttemptAt);
          failed++;
        }
        continue;
      }

      await store.markPublished(record.id);
      published++;
    }

    return { claimed: records.length, published, failed, dead };
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
