import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { BackfillProjectionsJob } from '../application/backfill-projections.job.js';
import { LocalProjectionsFacade } from '../application/local-projections.facade.js';
import { ProjectFinanceEvents } from '../application/project-finance-events.use-case.js';
import { ProjectTaskEvents } from '../application/project-task-events.use-case.js';
import { ProjectionsFacade } from '../application/projections.facade.js';
import { BackfillProgress } from '../domain/backfill-progress.js';
import { FinanceProjection } from '../domain/finance-projection.js';
import { InvoiceHistory } from '../domain/invoice-history.js';
import { ReportTenants } from '../domain/report-tenants.js';
import { TaskHistory } from '../domain/task-history.js';
import { TaskProjection } from '../domain/task-projection.js';
import { BillingServiceInvoiceHistory } from '../infrastructure/billing-service-invoice-history.js';
import { DirectoryReportTenants } from '../infrastructure/directory-report-tenants.js';
import { ProjectedDeliveryEntity } from '../infrastructure/persistence/entities/projected-delivery.entity.js';
import { ProjectedInvoiceEntity } from '../infrastructure/persistence/entities/projected-invoice.entity.js';
import { ProjectedTaskEntity } from '../infrastructure/persistence/entities/projected-task.entity.js';
import { ProjectionBackfillEntity } from '../infrastructure/persistence/entities/projection-backfill.entity.js';
import { TypeOrmBackfillProgress } from '../infrastructure/persistence/typeorm-backfill-progress.js';
import { TypeOrmFinanceProjection } from '../infrastructure/persistence/typeorm-finance-projection.js';
import { TypeOrmTaskProjection } from '../infrastructure/persistence/typeorm-task-projection.js';
import { TasksServiceHistory } from '../infrastructure/tasks-service-history.js';
import { ProjectionsConsumer } from './projections.consumer.js';

/** reports' own projections, fed by events and by the backfill from tasks and billing. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [
        ProjectedTaskEntity,
        ProjectedInvoiceEntity,
        ProjectedDeliveryEntity,
        ProjectionBackfillEntity,
      ],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  providers: [
    TenantShard,
    { provide: TaskProjection, useClass: TypeOrmTaskProjection },
    { provide: FinanceProjection, useClass: TypeOrmFinanceProjection },
    { provide: BackfillProgress, useClass: TypeOrmBackfillProgress },
    { provide: TaskHistory, useClass: TasksServiceHistory },
    { provide: InvoiceHistory, useClass: BillingServiceInvoiceHistory },
    { provide: ReportTenants, useClass: DirectoryReportTenants },
    ProjectTaskEvents,
    ProjectFinanceEvents,
    BackfillProjectionsJob,
    { provide: ProjectionsFacade, useClass: LocalProjectionsFacade },
    ProjectionsConsumer,
  ],
  exports: [ProjectionsFacade],
})
export class ProjectionsModule {}
