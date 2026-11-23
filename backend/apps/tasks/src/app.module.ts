import { Module } from '@nestjs/common';
import { ValkeyUsageCounterStore } from '@platform/adapters-valkey';
import { ValkeyMeteringModule } from '@platform/adapters-valkey/nest';
import { tasksContract } from '@contracts/tasks';
import { HttpModule } from '@platform/http/nest';
import { MeteringModule } from '@platform/metering/nest';
import { QuotasModule } from '@platform/quotas/nest';
import { SearchModule } from '@platform/search/nest';
import { RemoteIdentityAuthModule } from '@platform/service/nest';
import { TASKS_ERROR_CATALOGS } from './shared/constants/tasks-error-catalogs.constants.js';
import { PrivacyModule } from './modules/privacy/index.js';
import { TasksModule } from './modules/tasks/presentation/tasks.module.js';

@Module({
  imports: [
    RemoteIdentityAuthModule,
    SearchModule.forRoot(),
    HttpModule.forRoot({
      contract: tasksContract,
      catalogs: TASKS_ERROR_CATALOGS,
    }),
    ValkeyMeteringModule,
    MeteringModule.forRoot({
      service: tasksContract.service,
      counters: ValkeyUsageCounterStore,
    }),
    QuotasModule,
    TasksModule,
    PrivacyModule,
  ],
})
export class AppModule {}
