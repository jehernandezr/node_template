import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { type OutboxRecord, type OutboxStore, OutboxStatus } from './outbox.js';

/** Options for {@link InMemoryOutboxStore.add}. */
export interface AddOutboxOptions {
  /** Creation time and first due time. Defaults to now. */
  readonly now?: Date;
  readonly groupId?: string;
}

/** In-memory outbox adapter, suitable for tests and local runs. */
export class InMemoryOutboxStore implements OutboxStore {
  private readonly records = new Map<string, OutboxRecord>();

  /** Appends an envelope to the outbox. */
  add(envelope: MessageEnvelope, options: AddOutboxOptions = {}): OutboxRecord {
    const now = options.now ?? new Date();
    const record: OutboxRecord = {
      id: envelope.id,
      envelope,
      status: OutboxStatus.Pending,
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      groupId: options.groupId,
    };
    this.records.set(record.id, record);
    return record;
  }

  /** Current state of a record, if it exists. */
  get(id: string): OutboxRecord | undefined {
    return this.records.get(id);
  }

  claimPending(
    now: Date,
    limit: number,
    owner: string,
    leaseMs: number,
  ): Promise<OutboxRecord[]> {
    const t = now.getTime();
    const due = [...this.records.values()]
      .filter(
        (record) =>
          (record.status === OutboxStatus.Pending ||
            record.status === OutboxStatus.Failed) &&
          record.nextAttemptAt.getTime() <= t &&
          (record.leaseExpiresAt === undefined ||
            record.leaseExpiresAt.getTime() <= t),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);

    const leased = due.map((record) => {
      const next: OutboxRecord = {
        ...record,
        leaseOwner: owner,
        leaseExpiresAt: new Date(t + leaseMs),
      };
      this.records.set(record.id, next);
      return next;
    });
    return Promise.resolve(leased);
  }

  markPublished(id: string): Promise<void> {
    this.update(id, { status: OutboxStatus.Published });
    return Promise.resolve();
  }

  markFailed(id: string, error: string, nextAttemptAt: Date): Promise<void> {
    this.update(id, {
      status: OutboxStatus.Failed,
      lastError: error,
      nextAttemptAt,
    });
    return Promise.resolve();
  }

  markDead(id: string, error: string): Promise<void> {
    this.update(id, { status: OutboxStatus.Dead, lastError: error });
    return Promise.resolve();
  }

  private update(
    id: string,
    patch: Partial<
      Pick<OutboxRecord, 'status' | 'lastError' | 'nextAttemptAt'>
    >,
  ): void {
    const record = this.records.get(id);
    if (!record) return;
    this.records.set(id, {
      ...record,
      ...patch,
      attempts: record.attempts + 1,
      leaseOwner: undefined,
      leaseExpiresAt: undefined,
    });
  }
}
