import { Module } from '@nestjs/common';
import { ValkeyUsageCounterStore } from '@platform/adapters-valkey';
import { ValkeyMeteringModule } from '@platform/adapters-valkey/nest';
import { reportsContract } from '@contracts/reports';
import { HttpModule } from '@platform/http/nest';
import { MeteringModule } from '@platform/metering/nest';
import { RemoteIdentityAuthModule } from '@platform/service/nest';
import { REPORTS_ERROR_CATALOGS } from './shared/constants/reports-error-catalogs.constants.js';
import { CatalogModule } from './modules/catalog/presentation/catalog.module.js';
import { ProjectionsModule } from './modules/projections/presentation/projections.module.js';
import { RunsModule } from './modules/runs/presentation/runs.module.js';

@Module({
  imports: [
    RemoteIdentityAuthModule,
    HttpModule.forRoot({
      contract: reportsContract,
      catalogs: REPORTS_ERROR_CATALOGS,
    }),
    ValkeyMeteringModule,
    MeteringModule.forRoot({
      service: reportsContract.service,
      counters: ValkeyUsageCounterStore,
    }),
    ProjectionsModule,
    CatalogModule,
    RunsModule,
  ],
})
export class AppModule {}
