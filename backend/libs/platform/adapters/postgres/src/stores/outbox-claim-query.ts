import type { Clock } from '@platform/kernel';
import {
  type ClaimOutboxRequest,
  OutboxStatus,
  type OutboxRecord,
} from '@platform/messaging';
import { In, type EntityManager } from 'typeorm';
import { OutboxEntity } from '../entities/outbox.entity.js';
import { EnumSql } from '../entities/enum-sql.js';
import { OutboxRecordMapper } from './outbox-record.mapper.js';

interface OutboxCandidateRow {
  readonly id: string;
  readonly group_id: string | null;
  readonly created_at: Date | string;
  readonly seq: string | number;
}

interface OutboxCandidate {
  readonly id: string;
  readonly groupId: string | null;
  readonly createdAt: Date;
  readonly seq: number;
}

/**
 * Claims the due outbox records inside the transaction of the manager it receives: a single query with
 * `FOR UPDATE ... SKIP LOCKED` that respects per-group FIFO, and the lease with its fencing token.
 * The QueryBuilder cannot express the blocker's DISTINCT ON nor FOR UPDATE OF with SKIP LOCKED over a join.
 */
export class OutboxClaimQuery {
  private static readonly OPEN = EnumSql.list([
    OutboxStatus.Pending,
    OutboxStatus.Failed,
  ]);

  private static readonly PICK_SQL =
    'SELECT o.id, o.group_id, o.created_at, o.seq FROM outbox o ' +
    'LEFT JOIN (' +
    'SELECT DISTINCT ON (group_id) group_id, created_at, seq FROM outbox ' +
    `WHERE status IN (${OutboxClaimQuery.OPEN}) AND group_id IS NOT NULL ` +
    'AND (next_attempt_at > $1 OR lease_expires_at > $1) ' +
    'ORDER BY group_id, created_at, seq' +
    ') blocker ON blocker.group_id = o.group_id ' +
    `WHERE o.status IN (${OutboxClaimQuery.OPEN}) AND o.next_attempt_at <= $1 ` +
    'AND (o.lease_expires_at IS NULL OR o.lease_expires_at <= $1) ' +
    'AND (blocker.group_id IS NULL OR o.created_at < blocker.created_at ' +
    'OR (o.created_at = blocker.created_at AND o.seq < blocker.seq)) ' +
    'ORDER BY o.created_at, o.seq LIMIT $2 FOR UPDATE OF o SKIP LOCKED';

  constructor(private readonly clock: Clock) {}

  /**
   * Returns up to `request.limit` records with the lease set, from the oldest `created_at` to the newest.
   * @param manager Manager of the shard.
   * @param request Limit, lease and worker.
   * @returns The claimed records.
   */
  async claim(
    manager: EntityManager,
    request: ClaimOutboxRequest,
  ): Promise<OutboxRecord[]> {
    if (request.limit <= 0) {
      return [];
    }
    const rows: OutboxCandidateRow[] = await manager.query(
      OutboxClaimQuery.PICK_SQL,
      [request.now, request.limit],
    );
    const picked = rows.map((row): OutboxCandidate => ({
      id: row.id,
      groupId: row.group_id,
      createdAt: new Date(row.created_at),
      seq: Number(row.seq),
    }));
    const candidates = await this.withoutSkippedPredecessors(manager, picked);
    if (candidates.length === 0) {
      return [];
    }
    const ids = candidates.map((candidate) => candidate.id);
    await manager
      .createQueryBuilder()
      .update(OutboxEntity)
      .set({
        leaseOwner: request.lease.owner,
        leaseToken: request.lease.token,
        leaseExpiresAt: new Date(request.now.getTime() + request.leaseMs),
        updatedAt: this.clock.now(),
      })
      .where('id IN (:...ids)', { ids })
      .execute();
    const leased = await manager.find(OutboxEntity, {
      where: { id: In(ids) },
    });
    const byId = new Map(leased.map((entity) => [entity.id, entity]));
    return ids.flatMap((id) => {
      const entity = byId.get(id);
      return entity === undefined ? [] : [OutboxRecordMapper.toRecord(entity)];
    });
  }

  /**
   * Another relay may have locked (in its uncommitted claim) an earlier record of the group: `SKIP LOCKED`
   * skips it and its successor would look free. Discards the candidates of a group that has an earlier open record
   * outside the set this transaction just locked.
   * Only the ordering columns: the envelope of each open row of the group is not needed here.
   */
  private async withoutSkippedPredecessors(
    manager: EntityManager,
    candidates: readonly OutboxCandidate[],
  ): Promise<OutboxCandidate[]> {
    const groups = [
      ...new Set(
        candidates.flatMap((candidate) =>
          candidate.groupId === null ? [] : [candidate.groupId],
        ),
      ),
    ];
    if (groups.length === 0) {
      return [...candidates];
    }
    const others = await manager
      .createQueryBuilder(OutboxEntity, 'o')
      .select(['o.id', 'o.groupId', 'o.createdAt', 'o.seq'])
      .where('o.groupId IN (:...groups)', { groups })
      .andWhere('o.status IN (:...open)', {
        open: [OutboxStatus.Pending, OutboxStatus.Failed],
      })
      .getMany();
    const mine = new Set(candidates.map((candidate) => candidate.id));
    const outside = others.filter((other) => !mine.has(other.id));
    return candidates.filter(
      (candidate) =>
        candidate.groupId === null ||
        !outside.some(
          (other) =>
            other.groupId === candidate.groupId &&
            OutboxClaimQuery.isEarlier(
              { createdAt: other.createdAt, seq: other.seq },
              candidate,
            ),
        ),
    );
  }

  /** Whether `a` goes before `b`: by `created_at` and, on a tie, by `seq`. */
  private static isEarlier(
    a: { readonly createdAt: Date; readonly seq: number },
    b: { readonly createdAt: Date; readonly seq: number },
  ): boolean {
    const ta = a.createdAt.getTime();
    const tb = b.createdAt.getTime();
    return ta < tb || (ta === tb && a.seq < b.seq);
  }
}
