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
  identityConfigSchema,
  type IdentityConfig,
} from './config/identity.config.js';
import { identityCatalogMigrations } from './database/catalog-migrations.js';
import { identityShardMigrations } from './database/shard-migrations.js';
import { IDENTITY_ERROR_CATALOGS } from './shared/constants/identity-error-catalogs.constants.js';

/** Identity definition consumed by `ServiceBootstrap`, `ServiceMigrator` and the tests. */
export const identityService: ServiceDefinition<IdentityConfig> = {
  name: identityContract.service,
  configSchema: identityConfigSchema,
  rootModule: AppModule,
  contract: identityContract,
  peerContracts: [
    billingContract,
    notificationsContract,
    tasksContract,
    reportsContract,
  ],
  migrations: {
    catalog: { entities: [], migrations: identityCatalogMigrations },
    shard: { entities: [], migrations: identityShardMigrations },
  },
  sharding: { defaultKey: ShardKey.Tenant, requireScope: true },
  internalApi: {
    transport: ServiceInternalTransport.Http,
    http: (config, context) =>
      new SignedInternalHttp([
        billingContract.service,
        notificationsContract.service,
        tasksContract.service,
        reportsContract.service,
      ]).settings(config, context),
  },
  errorCatalogs: IDENTITY_ERROR_CATALOGS,
};
