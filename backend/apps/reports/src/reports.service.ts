import { billingContract } from '@contracts/billing';
import { identityContract } from '@contracts/identity';
import { notificationsContract } from '@contracts/notifications';
import { reportsContract } from '@contracts/reports';
import { tasksContract } from '@contracts/tasks';
import { ShardKey } from '@platform/sharding';
import {
  ServiceInternalTransport,
  SignedInternalHttp,
  type ServiceDefinition,
} from '@platform/service';
import { AppModule } from './app.module.js';
import {
  reportsConfigSchema,
  type ReportsConfig,
} from './config/reports.config.js';
import { reportsShardMigrations } from './database/shard-migrations.js';
import { REPORTS_ERROR_CATALOGS } from './shared/constants/reports-error-catalogs.constants.js';

/** Definición de reports que consumen `ServiceBootstrap`, `ServiceMigrator` y las pruebas. */
export const reportsService: ServiceDefinition<ReportsConfig> = {
  name: reportsContract.service,
  configSchema: reportsConfigSchema,
  rootModule: AppModule,
  contract: reportsContract,
  peerContracts: [
    identityContract,
    tasksContract,
    billingContract,
    notificationsContract,
  ],
  migrations: {
    catalog: { entities: [], migrations: [] },
    shard: { entities: [], migrations: reportsShardMigrations },
  },
  sharding: { defaultKey: ShardKey.Tenant, requireScope: true },
  internalApi: {
    transport: ServiceInternalTransport.Http,
    http: (config, context) =>
      new SignedInternalHttp([
        identityContract.service,
        tasksContract.service,
        billingContract.service,
      ]).settings(config, context),
  },
  errorCatalogs: REPORTS_ERROR_CATALOGS,
};
