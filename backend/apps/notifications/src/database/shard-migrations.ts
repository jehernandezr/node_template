import type { MigrationClass } from '@platform/persistence';
import { CreateNotificationDeliveries1796100300000 } from '../modules/dispatch/infrastructure/persistence/migrations/1796100300000-CreateNotificationDeliveries.js';
import { AllowSkippedDeliveries1796100300001 } from '../modules/dispatch/infrastructure/persistence/migrations/1796100300001-AllowSkippedDeliveries.js';
import { CreateNotifications1796100200000 } from '../modules/inbox/infrastructure/persistence/migrations/1796100200000-CreateNotifications.js';
import { AddNotificationsHomeTenant1796100200001 } from '../modules/inbox/infrastructure/persistence/migrations/1796100200001-AddNotificationsHomeTenant.js';
import { CreateNotificationPreferences1796100100000 } from '../modules/preferences/infrastructure/persistence/migrations/1796100100000-CreateNotificationPreferences.js';
import { AddPreferencesHomeTenant1796100100001 } from '../modules/preferences/infrastructure/persistence/migrations/1796100100001-AddPreferencesHomeTenant.js';
// generated:modules:imports

/** Migrations of the notifications shards, in module order. */
export const notificationsShardMigrations: readonly MigrationClass[] = [
  CreateNotificationPreferences1796100100000,
  AddPreferencesHomeTenant1796100100001,
  CreateNotifications1796100200000,
  AddNotificationsHomeTenant1796100200001,
  CreateNotificationDeliveries1796100300000,
  AllowSkippedDeliveries1796100300001,
  // generated:modules
];
