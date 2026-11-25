import type { MigrationClass } from '@platform/persistence';
import { emailCatalogMigrations } from '../modules/email/infrastructure/persistence/migrations/index.js';

/** Migrations of the notifications catalog: the email log and the suppression list. */
export const notificationsCatalogMigrations: readonly MigrationClass[] = [
  ...emailCatalogMigrations,
];
