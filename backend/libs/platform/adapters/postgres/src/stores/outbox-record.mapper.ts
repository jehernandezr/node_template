import { PlatformErrorCode } from '@contracts/platform';
import { OutboxStatus, type OutboxRecord } from '@platform/messaging';
import { PersistenceError } from '@platform/persistence';
import type { OutboxEntity } from '../entities/outbox.entity.js';

/** Convierte una fila de `outbox` en el `OutboxRecord` del puerto: los campos nulos quedan ausentes. */
export class OutboxRecordMapper {
  private static readonly STATUSES: readonly string[] =
    Object.values(OutboxStatus);

  /** @throws PersistenceError `PersistenceCorruptRow` si el estado de la fila no es un `OutboxStatus`. */
  static toRecord(entity: OutboxEntity): OutboxRecord {
    if (!OutboxRecordMapper.STATUSES.includes(entity.status)) {
      throw new PersistenceError(
        PlatformErrorCode.PersistenceCorruptRow,
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
