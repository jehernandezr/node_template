import type { MigrationClass } from '@platform/persistence';
import { CreatePasskeys1795000600000 } from './1795000600000-CreatePasskeys.js';
import { CreatePasskeyLookup1795000600001 } from './1795000600001-CreatePasskeyLookup.js';

export const passkeysShardMigrations: readonly MigrationClass[] = [
  CreatePasskeys1795000600000,
];
export const passkeysCatalogMigrations: readonly MigrationClass[] = [
  CreatePasskeyLookup1795000600001,
];
