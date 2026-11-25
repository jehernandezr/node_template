import { type Clock, SystemClock, TransactionManager } from '@platform/kernel';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';
import {
  type ClaimOutboxRequest,
  type OutboxAppend,
  type OutboxLease,
  type PurgeOutboxOptions,
  type OutboxRecord,
  OutboxStatus,
} from '../../outbox/outbox.js';
import { type OutboxStore } from '../../outbox/outbox-store.js';
import { type OutboxWriter } from '../../outbox/outbox-writer.js';

/** Options of {@link InMemoryOutboxStore.add}. */
export interface AddOutboxOptions {
  /** Creation instant and first due time. Defaults to the store clock. */
  readonly now?: Date;
  readonly groupId?: string;
  readonly delayMs?: number;
}

/** Options of {@link InMemoryOutboxStore}. */
export interface InMemoryOutboxStoreOptions {
  /** Default time of {@link InMemoryOutboxStore.add}. Defaults to the system clock. */
  readonly clock?: Clock;
  /**
   * Transactions whose rollback deletes the records added within them,
   * because a real store would never have written them.
   */
  readonly transactions?: TransactionManager;
}

type Patch = Partial<
  Pick<OutboxRecord, 'status' | 'lastError' | 'nextAttemptAt'>
>;

function isOpen(record: OutboxRecord): boolean {
  return (
    record.status === OutboxStatus.Pending ||
    record.status === OutboxStatus.Failed
  );
}

/** In-memory outbox adapter, for tests. */
export class InMemoryOutboxStore implements OutboxStore, OutboxWriter {
  private readonly records = new Map<string, OutboxRecord>();
  /** Instant of the last change of each record, for retention. */
  private readonly changedAt = new Map<string, number>();
  private readonly clock: Clock;
  private readonly transactions?: TransactionManager;

  constructor(options: InMemoryOutboxStoreOptions = {}) {
    this.clock = options.clock ?? new SystemClock();
    this.transactions = options.transactions;
  }

  /** Adds an envelope to the outbox. */
  add(envelope: MessageEnvelope, options: AddOutboxOptions = {}): OutboxRecord {
    const now = options.now ?? this.clock.now();
    const record: OutboxRecord = {
      id: envelope.id,
      envelope,
      status: OutboxStatus.Pending,
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      groupId: options.groupId,
      ...(options.delayMs === undefined ? {} : { delayMs: options.delayMs }),
    };
    this.records.set(record.id, record);
    return record;
  }

  /**
   * Adds a record in the open transaction of `transactions`, if there is one.
   * A rollback deletes it.
   */
  append(record: OutboxAppend): Promise<void> {
    const added = this.add(record.envelope, {
      now: record.createdAt,
      groupId: record.groupId,
      delayMs: record.delayMs,
    });
    this.transactions?.current()?.afterRollback(() => {
      this.records.delete(added.id);
    });
    return Promise.resolve();
  }

  purge(options: PurgeOutboxOptions): Promise<number> {
    const statuses = new Set([
      OutboxStatus.Published,
      ...(options.includeDead === true ? [OutboxStatus.Dead] : []),
    ]);
    let deleted = 0;
    for (const [id, record] of this.records) {
      const changed = this.changedAt.get(id);
      if (
        statuses.has(record.status) &&
        changed !== undefined &&
        changed < options.before.getTime()
      ) {
        this.records.delete(id);
        this.changedAt.delete(id);
        deleted++;
      }
    }
    return Promise.resolve(deleted);
  }

  /** Current state of a record, if it exists. */
  get(id: string): OutboxRecord | undefined {
    return this.records.get(id);
  }

  claimPending(request: ClaimOutboxRequest): Promise<OutboxRecord[]> {
    const t = request.now.getTime();
    // `Array.prototype.sort` is stable: with equal `createdAt` the insertion order is kept.
    const ordered = [...this.records.values()]
      .filter(isOpen)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const blockedGroups = new Set<string>();
    const due: OutboxRecord[] = [];
    for (const record of ordered) {
      if (due.length >= request.limit) break;
      const group = record.groupId;
      if (group !== undefined && blockedGroups.has(group)) continue;
      const eligible =
        record.nextAttemptAt.getTime() <= t &&
        (record.leaseExpiresAt === undefined ||
          record.leaseExpiresAt.getTime() <= t);
      if (eligible) {
        due.push(record);
      } else if (group !== undefined) {
        // An earlier record of the group is not due: the later ones wait.
        blockedGroups.add(group);
      }
    }

    const leased = due.map((record) => {
      const next: OutboxRecord = {
        ...record,
        leaseOwner: request.lease.owner,
        leaseToken: request.lease.token,
        leaseExpiresAt: new Date(t + request.leaseMs),
      };
      this.records.set(record.id, next);
      return next;
    });
    return Promise.resolve(leased);
  }

  markPublished(id: string, lease: OutboxLease): Promise<boolean> {
    return Promise.resolve(
      this.update(id, lease, { status: OutboxStatus.Published }, true),
    );
  }

  markFailed(
    id: string,
    lease: OutboxLease,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean> {
    return Promise.resolve(
      this.update(
        id,
        lease,
        { status: OutboxStatus.Failed, lastError: error, nextAttemptAt },
        true,
      ),
    );
  }

  markDead(id: string, lease: OutboxLease, error: string): Promise<boolean> {
    return Promise.resolve(
      this.update(
        id,
        lease,
        { status: OutboxStatus.Dead, lastError: error },
        true,
      ),
    );
  }

  releaseLease(id: string, lease: OutboxLease): Promise<boolean> {
    return Promise.resolve(this.update(id, lease, {}, false));
  }

  /** Applies `patch` only while `lease` is the current lease of the record. */
  private update(
    id: string,
    lease: OutboxLease,
    patch: Patch,
    countAttempt: boolean,
  ): boolean {
    const record = this.records.get(id);
    if (
      !record ||
      record.leaseOwner !== lease.owner ||
      record.leaseToken !== lease.token
    ) {
      return false;
    }
    this.changedAt.set(id, this.clock.now().getTime());
    this.records.set(id, {
      ...record,
      ...patch,
      attempts: countAttempt ? record.attempts + 1 : record.attempts,
      leaseOwner: undefined,
      leaseToken: undefined,
      leaseExpiresAt: undefined,
    });
    return true;
  }
}
