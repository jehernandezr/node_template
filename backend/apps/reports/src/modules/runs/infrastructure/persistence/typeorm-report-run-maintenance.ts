import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import { ReportRunStatus } from '@contracts/reports';
import { AcrossShards, TenantMaintenanceSession } from '@platform/persistence';
import { In, LessThan, type EntityManager } from 'typeorm';
import {
  ReportRunMaintenance,
  type TenantRun,
} from '../../domain/report-run-maintenance.js';
import { ReportRunEntity } from './entities/report-run.entity.js';

/** Mantenimiento de `report_runs` en todos los shards, cada uno en una transacción de mantenimiento. */
@Injectable()
export class TypeOrmReportRunMaintenance extends ReportRunMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async expireBefore(now: Date): Promise<readonly TenantRun[]> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(
        connection.dataSource.manager,
        async (manager) => {
          const expired = await manager.find(ReportRunEntity, {
            select: { id: true, tenantId: true },
            where: { status: ReportRunStatus.Ready, expiresAt: LessThan(now) },
          });
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

  replaceRequester(userId: string, replacement: UserRef): Promise<number> {
    return this.inEveryShard(async (manager) => {
      const result = await manager.update(
        ReportRunEntity,
        { requestedBy: userId },
        {
          requestedBy: replacement.userId,
          requestedByHomeTenantId: replacement.homeTenantId,
        },
      );
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
