import type { MigrationClass } from '@platform/persistence';
import { emailCatalogMigrations } from '../modules/email/infrastructure/persistence/migrations/index.js';

/** Migraciones del catálogo de notifications: el registro de correos y la lista de supresión. */
export const notificationsCatalogMigrations: readonly MigrationClass[] = [
  ...emailCatalogMigrations,
];
