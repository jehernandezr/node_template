import type { MigrationClass } from '@platform/persistence';
import { apiKeysCatalogMigrations } from '../modules/api-keys/infrastructure/persistence/migrations/index.js';
import { passkeysCatalogMigrations } from '../modules/passkeys/infrastructure/persistence/migrations/index.js';
import { tenantsCatalogMigrations } from '../modules/tenants/infrastructure/persistence/migrations/index.js';
import { usersCatalogMigrations } from '../modules/users/infrastructure/persistence/migrations/index.js';

/** Migraciones del catálogo de identity: usuarios, passkeys, tenants y API keys. */
export const identityCatalogMigrations: readonly MigrationClass[] = [
  ...usersCatalogMigrations,
  ...passkeysCatalogMigrations,
  ...tenantsCatalogMigrations,
  ...apiKeysCatalogMigrations,
];
