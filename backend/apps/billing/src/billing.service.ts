import { billingContract } from '@contracts/billing';
import { identityContract } from '@contracts/identity';
import { ShardKey } from '@platform/sharding';
import {
  ServiceInternalTransport,
  SignedInternalHttp,
  type ServiceDefinition,
} from '@platform/service';
import { AppModule } from './app.module.js';
import {
  billingConfigSchema,
  type BillingConfig,
} from './config/billing.config.js';
import { billingCatalogMigrations } from './database/catalog-migrations.js';
import { billingShardMigrations } from './database/shard-migrations.js';
import { BILLING_ERROR_CATALOGS } from './shared/constants/billing-error-catalogs.constants.js';

/** Definición de billing que consumen `ServiceBootstrap`, `ServiceMigrator` y las pruebas. */
export const billingService: ServiceDefinition<BillingConfig> = {
  name: billingContract.service,
  configSchema: billingConfigSchema,
  rootModule: AppModule,
  contract: billingContract,
  peerContracts: [identityContract],
  migrations: {
    catalog: { entities: [], migrations: billingCatalogMigrations },
    shard: { entities: [], migrations: billingShardMigrations },
  },
  sharding: { defaultKey: ShardKey.Tenant, requireScope: true },
  internalApi: {
    transport: ServiceInternalTransport.Http,
    http: (config, context) =>
      new SignedInternalHttp([identityContract.service]).settings(
        config,
        context,
      ),
  },
  errorCatalogs: BILLING_ERROR_CATALOGS,
};
