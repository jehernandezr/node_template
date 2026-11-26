import { OutboxStatus, type OutboxRecord } from '@platform/messaging';
import { PersistenceError, PersistenceErrorCode } from '@platform/persistence';
import type { OutboxEntity } from '../entities/outbox.entity.js';

/** Converts an `outbox` row into the port's `OutboxRecord`: null fields are left absent. */
export class OutboxRecordMapper {
  private static readonly STATUSES: readonly string[] =
    Object.values(OutboxStatus);

  /**
   * Rebuilds an outbox record from its row.
   * @param entity Stored row.
   * @returns The record.
   * @throws PersistenceError `PersistenceCorruptRow` if the row status is not an `OutboxStatus`.
   */
  static toRecord(entity: OutboxEntity): OutboxRecord {
    if (!OutboxRecordMapper.STATUSES.includes(entity.status)) {
      throw new PersistenceError(
        PersistenceErrorCode.CorruptRow,
        'Outbox row has an unknown status',
      );
    }
    return {
      id: entity.id,
      envelope: entity.envelope,
      status: entity.status,
      attempts: entity.attempts,
      nextAttemptAt: entity.nextAttemptAt,
      createdAt: entity.createdAt,
      ...(entity.groupId === null ? {} : { groupId: entity.groupId }),
      ...(entity.delayMs === null ? {} : { delayMs: entity.delayMs }),
      ...(entity.lastError === null ? {} : { lastError: entity.lastError }),
      ...(entity.leaseOwner === null ? {} : { leaseOwner: entity.leaseOwner }),
      ...(entity.leaseToken === null ? {} : { leaseToken: entity.leaseToken }),
      ...(entity.leaseExpiresAt === null
        ? {}
        : { leaseExpiresAt: entity.leaseExpiresAt }),
    };
  }
}
