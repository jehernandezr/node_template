import type { MigrationClass } from '@platform/persistence';
import { planCatalogMigrations } from '../modules/plans/infrastructure/persistence/migrations/index.js';

/** Billing catalog migrations: plans and their quotas. */
export const billingCatalogMigrations: readonly MigrationClass[] = [
  ...planCatalogMigrations,
];
