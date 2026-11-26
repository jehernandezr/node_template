import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import { ReportRunStatus } from '@contracts/reports';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import { In, type EntityManager } from 'typeorm';
import {
  ReportRunMaintenance,
  type TenantRun,
} from '../../domain/report-run-maintenance.js';
import { ReportRunEntity } from './entities/report-run.entity.js';

/**
 * Maintenance of `report_runs` in all shards, each in a maintenance transaction, without the rows of
 * tenants that have already moved to another shard.
 */
@Injectable()
export class TypeOrmReportRunMaintenance extends ReportRunMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  override async expireBefore(now: Date): Promise<readonly TenantRun[]> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(
        connection.dataSource.manager,
        async (manager) => {
          const expired = await manager
            .createQueryBuilder(ReportRunEntity, 'run')
            .select(['run.id', 'run.tenantId'])
            .where('run.status = :status', { status: ReportRunStatus.Ready })
            .andWhere('run.expiresAt < :now', { now })
            .andWhere(TenantWriteFence.unfenced('run.tenant_id'))
            .getMany();
          if (expired.length > 0) {
            await manager.update(
              ReportRunEntity,
              { id: In(expired.map((row) => row.id)) },
              { status: ReportRunStatus.Expired, resultBytes: null },
            );
          }
          return expired.map((row) => ({
            tenantId: row.tenantId,
            runId: row.id,
          }));
        },
      ),
    );
    return outcome.results.flatMap((result) => result.value);
  }

  override async replaceRequester(
    userId: string,
    replacement: UserRef,
  ): Promise<number> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(
        connection.dataSource.manager,
        async (manager: EntityManager) => {
          const result = await manager
            .createQueryBuilder()
            .update(ReportRunEntity)
            .set({
              requestedBy: replacement.userId,
              requestedByHomeTenantId: replacement.homeTenantId,
            })
            .where('"requested_by" = :userId', { userId })
            .andWhere(TenantWriteFence.unfenced('"report_runs"."tenant_id"'))
            .execute();
          return result.affected ?? 0;
        },
      ),
    );
    TenantMaintenanceSession.requireEveryShard(outcome);
    return outcome.results.reduce((total, result) => total + result.value, 0);
  }
}
