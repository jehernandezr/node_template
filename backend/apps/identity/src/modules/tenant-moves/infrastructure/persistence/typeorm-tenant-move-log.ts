import { Injectable } from '@nestjs/common';
import { CatalogDataSource } from '@platform/persistence';
import { LessThan } from 'typeorm';
import { CatalogTableRepository } from '../../../../database/catalog-table-repository.js';
import type { TenantMove } from '../../domain/tenant-move.js';
import { TenantMoveLog } from '../../domain/tenant-move-log.js';
import { TenantMoveStatus } from '../../domain/tenant-move-status.enum.js';
import { TenantMoveEntity } from './entities/tenant-move.entity.js';

/** `TenantMoveLog` over `tenant_moves` in the catalog. Each stage change only advances from the previous one. */
@Injectable()
export class TypeOrmTenantMoveLog
  extends CatalogTableRepository
  implements TenantMoveLog
{
  constructor(catalog: CatalogDataSource) {
    super(catalog);
  }

  /**
   * The unique index of moves in progress decides between two simultaneous launches.
   */
  async start(move: TenantMove): Promise<boolean> {
    const inserted: unknown[] = await this.write((manager) =>
      manager.query(
        'INSERT INTO "tenant_moves" ("move_id", "tenant_id", "target_group", "target_region", "saga_id", "status", "started_at") ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING RETURNING "move_id"',
        [
          move.moveId,
          move.tenantId,
          move.targetGroup,
          move.targetRegion,
          move.sagaId,
          move.status,
          move.startedAt,
        ],
      ),
    );
    return inserted.length > 0;
  }

  async runningFor(tenantId: string): Promise<TenantMove | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(TenantMoveEntity, {
        tenantId,
        status: TenantMoveStatus.Running,
      }),
    );
    return row === null ? undefined : TypeOrmTenantMoveLog.moveOf(row);
  }

  async markSwitched(moveId: string, at: Date): Promise<void> {
    await this.write((manager) =>
      manager.update(
        TenantMoveEntity,
        { moveId, status: TenantMoveStatus.Running },
        { status: TenantMoveStatus.Switched, switchedAt: at },
      ),
    );
  }

  async markAborted(moveId: string): Promise<void> {
    await this.write((manager) =>
      manager.update(
        TenantMoveEntity,
        { moveId, status: TenantMoveStatus.Running },
        { status: TenantMoveStatus.Aborted },
      ),
    );
  }

  async markCleanedUp(moveId: string): Promise<void> {
    await this.write((manager) =>
      manager.update(
        TenantMoveEntity,
        { moveId, status: TenantMoveStatus.Switched },
        { status: TenantMoveStatus.CleanedUp },
      ),
    );
  }

  async markCleanupAttempted(moveId: string, at: Date): Promise<void> {
    await this.write((manager) =>
      manager.update(
        TenantMoveEntity,
        { moveId, status: TenantMoveStatus.Switched },
        { cleanupAttemptedAt: at },
      ),
    );
  }

  async switchedBefore(
    before: Date,
    limit: number,
  ): Promise<readonly TenantMove[]> {
    const rows = await this.read((manager) =>
      manager.find(TenantMoveEntity, {
        where: {
          status: TenantMoveStatus.Switched,
          switchedAt: LessThan(before),
        },
        order: {
          cleanupAttemptedAt: { direction: 'ASC', nulls: 'FIRST' },
          switchedAt: 'ASC',
        },
        take: limit,
      }),
    );
    return rows.map((row) => TypeOrmTenantMoveLog.moveOf(row));
  }

  private static moveOf(row: TenantMoveEntity): TenantMove {
    return {
      moveId: row.moveId,
      tenantId: row.tenantId,
      targetGroup: row.targetGroup,
      targetRegion: row.targetRegion,
      sagaId: row.sagaId,
      status: row.status as TenantMoveStatus,
      startedAt: row.startedAt,
      ...(row.switchedAt === null ? {} : { switchedAt: row.switchedAt }),
      ...(row.cleanupAttemptedAt === null
        ? {}
        : { cleanupAttemptedAt: row.cleanupAttemptedAt }),
    };
  }
}
