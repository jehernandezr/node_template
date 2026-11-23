import type { MigrationClass } from '@platform/persistence';
import { CreateNotificationDeliveries1796100300000 } from '../modules/dispatch/infrastructure/persistence/migrations/1796100300000-CreateNotificationDeliveries.js';
import { CreateNotifications1796100200000 } from '../modules/inbox/infrastructure/persistence/migrations/1796100200000-CreateNotifications.js';
import { CreateNotificationPreferences1796100100000 } from '../modules/preferences/infrastructure/persistence/migrations/1796100100000-CreateNotificationPreferences.js';

/** Migraciones de los shards de notifications, en el orden de los módulos. */
export const notificationsShardMigrations: readonly MigrationClass[] = [
  CreateNotificationPreferences1796100100000,
  CreateNotifications1796100200000,
  CreateNotificationDeliveries1796100300000,
];
