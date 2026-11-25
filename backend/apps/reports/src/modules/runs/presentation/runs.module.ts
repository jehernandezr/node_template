import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { CreateRun } from '../application/create-run.use-case.js';
import { EraseRequester } from '../application/erase-requester.use-case.js';
import { ExecuteRun } from '../application/execute-run.use-case.js';
import { ExpireRunsJob } from '../application/expire-runs.job.js';
import { RunQueries } from '../application/run-queries.js';
import { ReportEntitlements } from '../domain/report-entitlements.js';
import { ReportResultStore } from '../domain/report-result-store.js';
import { ReportRunMaintenance } from '../domain/report-run-maintenance.js';
import { ReportRunRepository } from '../domain/report-run.repository.js';
import { GrantReportEntitlements } from '../infrastructure/grant-report-entitlements.js';
import { ReportResultStoreSelector } from '../infrastructure/report-result-store-selector.js';
import { ReportRunEntity } from '../infrastructure/persistence/entities/report-run.entity.js';
import { TypeOrmReportRunMaintenance } from '../infrastructure/persistence/typeorm-report-run-maintenance.js';
import { RowReportResultStore } from '../infrastructure/persistence/row-report-result-store.js';
import { TypeOrmReportRunRepository } from '../infrastructure/persistence/typeorm-report-run.repository.js';
import { RunsConsumer } from './runs.consumer.js';
import { RunsController } from './runs.controller.js';
import { RunsInternalOperations } from './runs.internal-operations.js';
import { ReportsSettings } from '../../../config/reports-settings.js';

/** Report runs: creation, computation in the worker, query, download, expiration and user deletion. */
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [ReportRunEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  controllers: [RunsController],
  providers: [
    ReportsSettings,
    { provide: ReportRunRepository, useClass: TypeOrmReportRunRepository },
    { provide: ReportRunMaintenance, useClass: TypeOrmReportRunMaintenance },
    RowReportResultStore,
    {
      provide: ReportResultStore,
      useFactory: (
        settings: ReportsSettings,
        row: RowReportResultStore,
      ): ReportResultStore =>
        new ReportResultStoreSelector(row).select(
          settings.values.REPORTS_RESULT_STORE,
        ),
      inject: [ReportsSettings, RowReportResultStore],
    },
    { provide: ReportEntitlements, useClass: GrantReportEntitlements },
    CreateRun,
    ExecuteRun,
    RunQueries,
    ExpireRunsJob,
    EraseRequester,
    RunsConsumer,
    RunsInternalOperations,
  ],
})
export class RunsModule {}
