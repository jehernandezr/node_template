import { Injectable } from '@nestjs/common';
import type { ReportResult } from '@contracts/reports';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import type { QueryDeepPartialEntity } from 'typeorm';
import { ReportResultStore } from '../../domain/report-result-store.js';
import { ReportRunEntity } from './entities/report-run.entity.js';

/** `ReportResultStore` in the `result` column of `report_runs`, in the tenant's shard. */
@Injectable()
export class RowReportResultStore
  extends TenantIsolatedRepository
  implements ReportResultStore
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async save(runId: string, result: ReportResult): Promise<void> {
    await this.writeResult(runId, { ...result });
  }

  async load(runId: string): Promise<ReportResult | undefined> {
    const tenantId = this.tenantId();
    const row = await this.read((manager) =>
      manager.findOne(ReportRunEntity, {
        select: { id: true, result: true },
        where: { id: runId, tenantId },
      }),
    );
    if (row === null || row.result === null) {
      return undefined;
    }
    return row.result as unknown as ReportResult;
  }

  async discard(runId: string): Promise<void> {
    await this.writeResult(runId, null);
  }

  private async writeResult(
    runId: string,
    result: Record<string, unknown> | null,
  ): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.update(ReportRunEntity, { id: runId, tenantId }, {
        result,
      } as QueryDeepPartialEntity<ReportRunEntity>),
    );
  }
}
