import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
  type AcrossShardsResult,
} from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import { TaskMaintenance } from '../../domain/task-maintenance.js';
import { TaskEntity } from './entities/task.entity.js';

/**
 * Mantenimiento de `tasks` en todos los shards, cada uno en una transacción de mantenimiento: estas
 * operaciones tocan todos los tenants del shard, salvo los que ya se trasladaron a otro. Un shard caído se
 * reintenta en la próxima corrida.
 */
@Injectable()
export class TypeOrmTaskMaintenance extends TaskMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async purgeDeletedBefore(cutoff: Date): Promise<number> {
    const outcome = await this.inEveryShard(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .delete()
        .from(TaskEntity)
        .where('"deleted_at" < :cutoff', { cutoff })
        .andWhere(TenantWriteFence.unfenced('"tasks"."tenant_id"'))
        .execute();
      return result.affected ?? 0;
    });
    return TypeOrmTaskMaintenance.total(outcome);
  }

  /** Una sola sentencia por shard: cada tarea cuenta una vez aunque el usuario la haya creado y editado. */
  async replaceAuthor(userId: string, replacement: UserRef): Promise<number> {
    const outcome = await this.inEveryShard(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(TaskEntity)
        .set({
          createdByHomeTenantId: () =>
            `CASE WHEN "created_by" = :userId THEN CAST(:homeTenantId AS uuid) ELSE "created_by_home_tenant_id" END`,
          createdBy: () =>
            `CASE WHEN "created_by" = :userId THEN :replacement ELSE "created_by" END`,
          updatedBy: () =>
            `CASE WHEN "updated_by" = :userId THEN :replacement ELSE "updated_by" END`,
        })
        .where('("created_by" = :userId OR "updated_by" = :userId)')
        .andWhere(TenantWriteFence.unfenced('"tasks"."tenant_id"'))
        .setParameters({
          userId,
          replacement: replacement.userId,
          homeTenantId: replacement.homeTenantId,
        })
        .execute();
      return result.affected ?? 0;
    });
    TenantMaintenanceSession.requireEveryShard(outcome);
    return TypeOrmTaskMaintenance.total(outcome);
  }

  private inEveryShard(
    fn: (manager: EntityManager) => Promise<number>,
  ): Promise<AcrossShardsResult<number>> {
    return this.shards.run((connection) =>
      TenantMaintenanceSession.run(connection.dataSource.manager, fn),
    );
  }

  private static total(outcome: AcrossShardsResult<number>): number {
    return outcome.results.reduce((total, result) => total + result.value, 0);
  }
}
