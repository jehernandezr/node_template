import type { MigrationClass } from '@platform/persistence';
import { CreateApiKeys1795001100000 } from './1795001100000-CreateApiKeys.js';
import { CreateApiKeyLookup1795001100001 } from './1795001100001-CreateApiKeyLookup.js';
import { EnableApiKeysTenantIsolation1795001100002 } from './1795001100002-EnableApiKeysTenantIsolation.js';

export const apiKeysShardMigrations: readonly MigrationClass[] = [
  CreateApiKeys1795001100000,
  EnableApiKeysTenantIsolation1795001100002,
];
export const apiKeysCatalogMigrations: readonly MigrationClass[] = [
  CreateApiKeyLookup1795001100001,
];
