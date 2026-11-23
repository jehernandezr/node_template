import type { MigrationClass } from '@platform/persistence';
import { apiKeysCatalogMigrations } from '../modules/api-keys/infrastructure/persistence/migrations/index.js';
import { passkeysCatalogMigrations } from '../modules/passkeys/infrastructure/persistence/migrations/index.js';
import { sagasCatalogMigrations } from '../modules/sagas/infrastructure/persistence/migrations/index.js';
import { tenantsCatalogMigrations } from '../modules/tenants/infrastructure/persistence/migrations/index.js';
import { usersCatalogMigrations } from '../modules/users/infrastructure/persistence/migrations/index.js';

/** Migraciones del catálogo de identity: usuarios, passkeys, tenants, API keys y el directorio de sagas. */
export const identityCatalogMigrations: readonly MigrationClass[] = [
  ...usersCatalogMigrations,
  ...passkeysCatalogMigrations,
  ...tenantsCatalogMigrations,
  ...apiKeysCatalogMigrations,
  ...sagasCatalogMigrations,
];
