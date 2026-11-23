import type { MigrationClass } from '@platform/persistence';
import { planCatalogMigrations } from '../modules/plans/infrastructure/persistence/migrations/index.js';

/** Migraciones del catálogo de billing: los planes y sus cuotas. */
export const billingCatalogMigrations: readonly MigrationClass[] = [
  ...planCatalogMigrations,
];
