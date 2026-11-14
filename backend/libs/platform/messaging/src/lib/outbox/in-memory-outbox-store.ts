import { type Clock, SystemClock } from '@platform/kernel';
import type { UnitOfWork } from '@platform/persistence';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import {
  type ClaimOutboxRequest,
  type OutboxAppend,
  type OutboxLease,
  type OutboxRecord,
  type OutboxStore,
  type OutboxWriter,
  OutboxStatus,
} from './outbox.js';

/** Options for {@link InMemoryOutboxStore.add}. */
export interface AddOutboxOptions {
  /** Creation time and first due time. Defaults to the store clock. */
  readonly now?: Date;
  readonly groupId?: string;
  readonly delayMs?: number;
}

/** Options of {@link InMemoryOutboxStore}. */
export interface InMemoryOutboxStoreOptions {
  /** Default time for {@link InMemoryOutboxStore.add}. Defaults to the system clock. */
  readonly clock?: Clock;
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

/** In-memory outbox adapter, suitable for tests and local runs. */
export class InMemoryOutboxStore implements OutboxStore, OutboxWriter {
  private readonly records = new Map<string, OutboxRecord>();
  private readonly clock: Clock;

  constructor(options: InMemoryOutboxStoreOptions = {}) {
    this.clock = options.clock ?? new SystemClock();
  }

  /** Appends an envelope to the outbox. */
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
   * Appends a record inside a unit of work. A rollback removes it, as a real
   * store would never have written it.
   */
  append(record: OutboxAppend, uow: UnitOfWork): Promise<void> {
    const added = this.add(record.envelope, {
      now: record.createdAt,
      groupId: record.groupId,
      delayMs: record.delayMs,
    });
    uow.afterRollback(() => {
      this.records.delete(added.id);
    });
    return Promise.resolve();
  }

  /** Current state of a record, if it exists. */
  get(id: string): OutboxRecord | undefined {
    return this.records.get(id);
  }

  claimPending(request: ClaimOutboxRequest): Promise<OutboxRecord[]> {
    const t = request.now.getTime();
    // Array.prototype.sort is stable: equal createdAt keeps insertion order.
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
        // An older record of the group is not due: later ones must wait.
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

  /** Applies `patch` only while `lease` is the record's current lease. */
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
