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
  notificationsConfigSchema,
  type NotificationsConfig,
} from './config/notifications.config.js';
import { notificationsCatalogMigrations } from './database/catalog-migrations.js';
import { notificationsShardMigrations } from './database/shard-migrations.js';
import { NOTIFICATIONS_ERROR_CATALOGS } from './shared/constants/notifications-error-catalogs.constants.js';

/** Definición de notifications que consumen `ServiceBootstrap`, `ServiceMigrator` y las pruebas. */
export const notificationsService: ServiceDefinition<NotificationsConfig> = {
  name: notificationsContract.service,
  configSchema: notificationsConfigSchema,
  rootModule: AppModule,
  contract: notificationsContract,
  peerContracts: [
    identityContract,
    tasksContract,
    billingContract,
    reportsContract,
  ],
  migrations: {
    catalog: { entities: [], migrations: notificationsCatalogMigrations },
    shard: { entities: [], migrations: notificationsShardMigrations },
  },
  sharding: { defaultKey: ShardKey.User, requireScope: true },
  internalApi: {
    transport: ServiceInternalTransport.Http,
    http: (config, context) =>
      new SignedInternalHttp([identityContract.service]).settings(
        config,
        context,
      ),
  },
  errorCatalogs: NOTIFICATIONS_ERROR_CATALOGS,
};
