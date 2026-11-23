import { Module } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import type { ReportsConfig } from '../../../config/reports.config.js';
import { ReportResultStoreKind } from '../../../shared/enums/report-result-store-kind.enum.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
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
import { ReportRunEntity } from '../infrastructure/persistence/entities/report-run.entity.js';
import { TypeOrmReportRunMaintenance } from '../infrastructure/persistence/typeorm-report-run-maintenance.js';
import { RowReportResultStore } from '../infrastructure/persistence/row-report-result-store.js';
import { TypeOrmReportRunRepository } from '../infrastructure/persistence/typeorm-report-run.repository.js';
import { RunsConsumer } from './runs.consumer.js';
import { RunsController } from './runs.controller.js';
import { RunsInternalOperations } from './runs.internal-operations.js';

/** Ejecuciones de reporte: alta, cálculo en el worker, consulta, descarga, vencimiento y borrado de usuario. */
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [ReportRunEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  controllers: [RunsController],
  providers: [
    TenantShard,
    { provide: ReportRunRepository, useClass: TypeOrmReportRunRepository },
    { provide: ReportRunMaintenance, useClass: TypeOrmReportRunMaintenance },
    RowReportResultStore,
    {
      provide: ReportResultStore,
      useFactory: (
        config: AppConfig,
        row: RowReportResultStore,
      ): ReportResultStore => {
        switch (config.root<ReportsConfig>().REPORTS_RESULT_STORE) {
          case ReportResultStoreKind.Row:
            return row;
        }
      },
      inject: [AppConfig, RowReportResultStore],
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
