import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import { AcrossShards, TenantMaintenanceSession } from '@platform/persistence';
import { LessThan, type EntityManager } from 'typeorm';
import { TaskMaintenance } from '../../domain/task-maintenance.js';
import { TaskEntity } from './entities/task.entity.js';

/**
 * Mantenimiento de `tasks` en todos los shards, cada uno en una transacción de mantenimiento: estas
 * operaciones tocan todos los tenants del shard. Un shard caído se reintenta en la próxima corrida.
 */
@Injectable()
export class TypeOrmTaskMaintenance extends TaskMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  purgeDeletedBefore(cutoff: Date): Promise<number> {
    return this.inEveryShard(async (manager) => {
      const result = await manager.delete(TaskEntity, {
        deletedAt: LessThan(cutoff),
      });
      return result.affected ?? 0;
    });
  }

  /** Una sola sentencia por shard: cada tarea cuenta una vez aunque el usuario la haya creado y editado. */
  replaceAuthor(userId: string, replacement: UserRef): Promise<number> {
    return this.inEveryShard(async (manager) => {
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
        .where('"created_by" = :userId OR "updated_by" = :userId')
        .setParameters({
          userId,
          replacement: replacement.userId,
          homeTenantId: replacement.homeTenantId,
        })
        .execute();
      return result.affected ?? 0;
    });
  }

  private async inEveryShard(
    fn: (manager: EntityManager) => Promise<number>,
  ): Promise<number> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(connection.dataSource.manager, fn),
    );
    return outcome.results.reduce((total, result) => total + result.value, 0);
  }
}
