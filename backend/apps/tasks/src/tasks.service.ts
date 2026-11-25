import { billingContract } from '@contracts/billing';
import { identityContract } from '@contracts/identity';
import { tasksContract } from '@contracts/tasks';
import { ShardKey } from '@platform/sharding';
import {
  ServiceInternalTransport,
  SignedInternalHttp,
  type ServiceDefinition,
} from '@platform/service';
import { AppModule } from './app.module.js';
import { tasksConfigSchema, type TasksConfig } from './config/tasks.config.js';
import { tasksShardMigrations } from './database/shard-migrations.js';
import { TASKS_ERROR_CATALOGS } from './shared/constants/tasks-error-catalogs.constants.js';

/** tasks definition consumed by `ServiceBootstrap`, `ServiceMigrator` and the tests. */
export const tasksService: ServiceDefinition<TasksConfig> = {
  name: tasksContract.service,
  configSchema: tasksConfigSchema,
  rootModule: AppModule,
  contract: tasksContract,
  peerContracts: [identityContract, billingContract],
  migrations: {
    catalog: { entities: [], migrations: [] },
    shard: { entities: [], migrations: tasksShardMigrations },
  },
  sharding: { defaultKey: ShardKey.Tenant, requireScope: true },
  internalApi: {
    transport: ServiceInternalTransport.Http,
    http: (config, context) =>
      new SignedInternalHttp([
        identityContract.service,
        billingContract.service,
      ]).settings(config, context),
  },
  errorCatalogs: TASKS_ERROR_CATALOGS,
};
