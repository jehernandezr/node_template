import { identityContract } from '@contracts/identity';
import { __nameCamel__Contract } from '@contracts/__name__';
import { ShardKey } from '@platform/sharding';
import {
  ServiceInternalTransport,
  SignedInternalHttp,
  type ServiceDefinition,
} from '@platform/service';
import { AppModule } from './app.module.js';
import {
  __nameCamel__ConfigSchema,
  type __Name__Config,
} from './config/__name__.config.js';
import { __nameCamel__ShardMigrations } from './database/shard-migrations.js';
import { __NAME___ERROR_CATALOGS } from './shared/constants/__name__-error-catalogs.constants.js';

/** Definición de __name__ que consumen `ServiceBootstrap`, `ServiceMigrator` y las pruebas. */
export const __nameCamel__Service: ServiceDefinition<__Name__Config> = {
  name: __nameCamel__Contract.service,
  configSchema: __nameCamel__ConfigSchema,
  rootModule: AppModule,
  contract: __nameCamel__Contract,
  peerContracts: [identityContract],
  migrations: {
    catalog: { entities: [], migrations: [] },
    shard: { entities: [], migrations: __nameCamel__ShardMigrations },
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
  errorCatalogs: __NAME___ERROR_CATALOGS,
};
