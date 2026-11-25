import { Injectable } from '@nestjs/common';
import {
  OptimisticLockError,
  RepositoryKit,
  TenantIsolatedRepository,
} from '@platform/persistence';
import {
  ReportRunRepository,
  type ReportRunPageRequest,
} from '../../domain/report-run.repository.js';
import type { ReportRun } from '../../domain/report-run.js';
import { ReportRunEntity } from './entities/report-run.entity.js';
import { ReportRunMapper } from './report-run.mapper.js';

/** `ReportRunRepository` over `report_runs` in the tenant's shard. */
@Injectable()
export class TypeOrmReportRunRepository
  extends TenantIsolatedRepository
  implements ReportRunRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  insert(run: ReportRun): Promise<void> {
    return this.insertOwned(ReportRunEntity, ReportRunMapper.toRow(run));
  }

  async find(runId: string): Promise<ReportRun | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(ReportRunEntity, { id: runId, tenantId }),
    );
    return row === null ? undefined : ReportRunMapper.toDomain(row);
  }

  async update(run: ReportRun): Promise<ReportRun> {
    await this.updateOwned(ReportRunEntity, ReportRunMapper.toRow(run));
    const saved = await this.find(run.snapshot().id);
    if (saved === undefined) {
      throw new OptimisticLockError('report_runs', run.snapshot().version ?? 0);
    }
    return saved;
  }

  async page(request: ReportRunPageRequest): Promise<readonly ReportRun[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) => {
      const query = manager
        .createQueryBuilder(ReportRunEntity, 'run')
        .where('run.tenantId = :tenantId', { tenantId })
        .orderBy('run.id', 'DESC')
        .take(request.limit);
      if (request.type !== undefined) {
        query.andWhere('run.type = :type', { type: request.type });
      }
      if (request.status !== undefined) {
        query.andWhere('run.status = :status', { status: request.status });
      }
      if (request.afterId !== undefined) {
        query.andWhere('run.id < :afterId', { afterId: request.afterId });
      }
      return query.getMany();
    });
    return rows.map((row) => ReportRunMapper.toDomain(row));
  }
}
