import type { Clock } from '@platform/kernel';
import {
  type ClaimOutboxRequest,
  OutboxStatus,
  type OutboxAppend,
  type OutboxLease,
  type OutboxRecord,
  type OutboxStore,
  type OutboxWriter,
  type PurgeOutboxOptions,
} from '@platform/messaging';
import { ManagerIntent } from '@platform/persistence';
import type { PlatformEntityManagers } from '../database/platform-entity-managers.js';
import { OutboxEntity } from '../entities/outbox.entity.js';
import type { OutboxClaimQuery } from './outbox-claim-query.js';
import { OutboxRecordMapper } from './outbox-record.mapper.js';

interface OutboxChange {
  readonly status: OutboxStatus;
  readonly error?: string;
  readonly nextAttemptAt?: Date;
}

/**
 * TypeORM adapter of `OutboxStore` and `OutboxWriter` of `@platform/messaging`, on the shard `outbox` table.
 *
 * - `append` inserts in the open transaction, so the record commits or rolls back with the business change. It is
 *   idempotent by envelope id.
 * - `claimPending` runs in a short transaction: it picks the due rows in a single query, with a single `LIMIT`
 *   and `FOR UPDATE SKIP LOCKED` (several relays do not step on each other), and sets the lease with its fencing token. It respects FIFO
 *   by `groupId`.
 * - The marks only apply while the row keeps the given lease; otherwise they return `false`.
 * - The order is `created_at` and then `seq`.
 */
export class TypeOrmOutboxStore implements OutboxStore, OutboxWriter {
  constructor(
    private readonly managers: PlatformEntityManagers,
    private readonly clock: Clock,
    private readonly claims: OutboxClaimQuery,
  ) {}

  /**
   * TypeORM types JSON deeply and does not accept `unknown`; the value is stored as is in `jsonb`.
   */
  async append(record: OutboxAppend): Promise<void> {
    await this.managers.run(ManagerIntent.Write, (manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(OutboxEntity)
        .values({
          id: record.envelope.id,
          envelope: record.envelope as never,
          status: OutboxStatus.Pending,
          attempts: 0,
          nextAttemptAt: record.createdAt,
          createdAt: record.createdAt,
          updatedAt: record.createdAt,
          groupId: record.groupId ?? null,
          delayMs: record.delayMs ?? null,
          lastError: null,
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
        })
        .orIgnore()
        .execute(),
    );
  }

  claimPending(request: ClaimOutboxRequest): Promise<OutboxRecord[]> {
    return this.managers.run(ManagerIntent.Write, (manager) =>
      this.claims.claim(manager, request),
    );
  }

  markPublished(id: string, lease: OutboxLease): Promise<boolean> {
    return this.mark(id, lease, { status: OutboxStatus.Published });
  }

  markFailed(
    id: string,
    lease: OutboxLease,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean> {
    return this.mark(id, lease, {
      status: OutboxStatus.Failed,
      error,
      nextAttemptAt,
    });
  }

  markDead(id: string, lease: OutboxLease, error: string): Promise<boolean> {
    return this.mark(id, lease, { status: OutboxStatus.Dead, error });
  }

  async releaseLease(id: string, lease: OutboxLease): Promise<boolean> {
    return this.managers.run(ManagerIntent.Write, async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(OutboxEntity)
        .set({
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
          updatedAt: this.clock.now(),
        })
        .where({ id, leaseOwner: lease.owner, leaseToken: lease.token })
        .execute();
      return (result.affected ?? 0) > 0;
    });
  }

  /** Returns the current state of a record, if it exists. For diagnostics and tests. */
  async get(id: string): Promise<OutboxRecord | undefined> {
    const entity = await this.managers.run(
      ManagerIntent.ReadPrimary,
      (manager) => manager.findOneBy(OutboxEntity, { id }),
    );
    return entity === null ? undefined : OutboxRecordMapper.toRecord(entity);
  }

  /** Retention of published records (and of dead ones with `includeDead`); visits all shards if none is pinned. */
  purge(options: PurgeOutboxOptions): Promise<number> {
    const statuses =
      options.includeDead === true
        ? [OutboxStatus.Published, OutboxStatus.Dead]
        : [OutboxStatus.Published];
    return this.managers.sweep(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .delete()
        .from(OutboxEntity)
        .where('status IN (:...statuses) AND updated_at < :before', {
          statuses,
          before: options.before,
        })
        .execute();
      return result.affected ?? 0;
    });
  }

  private mark(
    id: string,
    lease: OutboxLease,
    change: OutboxChange,
  ): Promise<boolean> {
    return this.managers.run(ManagerIntent.Write, async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(OutboxEntity)
        .set({
          status: change.status,
          attempts: () => '"attempts" + 1',
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
          updatedAt: this.clock.now(),
          ...(change.error === undefined ? {} : { lastError: change.error }),
          ...(change.nextAttemptAt === undefined
            ? {}
            : { nextAttemptAt: change.nextAttemptAt }),
        })
        .where({ id, leaseOwner: lease.owner, leaseToken: lease.token })
        .execute();
      return (result.affected ?? 0) > 0;
    });
  }
}
