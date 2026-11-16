import { billingContract } from '@contracts/billing';
import { identityContract } from '@contracts/identity';
import { ShardKey } from '@platform/sharding';
import {
  ServiceInternalTransport,
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

/** Definición de identity que consumen `ServiceBootstrap`, `ServiceMigrator` y las pruebas. */
export const identityService: ServiceDefinition<IdentityConfig> = {
  name: identityContract.service,
  configSchema: identityConfigSchema,
  rootModule: AppModule,
  contract: identityContract,
  peerContracts: [billingContract],
  migrations: {
    catalog: { entities: [], migrations: identityCatalogMigrations },
    shard: { entities: [], migrations: identityShardMigrations },
  },
  sharding: { defaultKey: ShardKey.Tenant, requireScope: true },
  internalApi: {
    transport: ServiceInternalTransport.Http,
    http: (config) => ({
      baseUrls: {},
      secret: config.root<IdentityConfig>().INTERNAL_API_SHARED_SECRET.reveal(),
    }),
  },
  errorCatalogs: IDENTITY_ERROR_CATALOGS,
};
