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
 * Adaptador TypeORM de `OutboxStore` y `OutboxWriter` de `@platform/messaging`, sobre la tabla `outbox` del shard.
 *
 * - `append` inserta en la transacción abierta, así el registro se confirma o se deshace con el cambio de negocio. Es
 *   idempotente por id del envelope.
 * - `claimPending` corre en una transacción corta: elige en una sola consulta las filas vencidas, con un solo `LIMIT`
 *   y `FOR UPDATE SKIP LOCKED` (varios relays no se pisan), y les pone el lease con su token de fencing. Respeta FIFO
 *   por `groupId`.
 * - Las marcas solo aplican mientras la fila conserve el lease dado; si no, devuelven `false`.
 * - El orden es `created_at` y luego `seq`.
 */
export class TypeOrmOutboxStore implements OutboxStore, OutboxWriter {
  constructor(
    private readonly managers: PlatformEntityManagers,
    private readonly clock: Clock,
    private readonly claims: OutboxClaimQuery,
  ) {}

  async append(record: OutboxAppend): Promise<void> {
    await this.managers.run(ManagerIntent.Write, (manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(OutboxEntity)
        .values({
          id: record.envelope.id,
          // TypeORM tipa el JSON de forma profunda y no admite `unknown`; el valor se guarda tal cual en `jsonb`.
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

  /** Estado actual de un registro, si existe. Para diagnóstico y pruebas. */
  async get(id: string): Promise<OutboxRecord | undefined> {
    const entity = await this.managers.run(
      ManagerIntent.ReadPrimary,
      (manager) => manager.findOneBy(OutboxEntity, { id }),
    );
    return entity === null ? undefined : OutboxRecordMapper.toRecord(entity);
  }

  /** Retención de publicados (y de muertos con `includeDead`); recorre todos los shards si no hay uno fijo. */
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
