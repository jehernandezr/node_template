import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { FinanceProjection } from '../domain/finance-projection.js';
import type {
  ActivityPoint,
  DeliveryPoint,
  InvoicePoint,
  StatusCount,
} from '../domain/projection-points.js';
import type { BucketedRange, ReportRange } from '../domain/report-range.js';
import { TaskProjection } from '../domain/task-projection.js';
import { ProjectionsFacade } from './projections.facade.js';

/** In-process `ProjectionsFacade`. */
@Injectable()
export class LocalProjectionsFacade extends ProjectionsFacade {
  constructor(
    private readonly tasks: TaskProjection,
    private readonly finance: FinanceProjection,
    private readonly shard: ShardScopes,
  ) {
    super();
  }

  taskStatusCounts(
    tenantId: string,
    range: ReportRange,
  ): Promise<readonly StatusCount[]> {
    return this.shard.inTenantShard(tenantId, () =>
      this.tasks.statusCounts(range),
    );
  }

  taskActivity(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly ActivityPoint[]> {
    return this.shard.inTenantShard(tenantId, () => this.tasks.activity(range));
  }

  invoiceSummary(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly InvoicePoint[]> {
    return this.shard.inTenantShard(tenantId, () =>
      this.finance.invoices(range),
    );
  }

  deliverySummary(
    tenantId: string,
    range: BucketedRange,
  ): Promise<readonly DeliveryPoint[]> {
    return this.shard.inTenantShard(tenantId, () =>
      this.finance.deliveries(range),
    );
  }
}
