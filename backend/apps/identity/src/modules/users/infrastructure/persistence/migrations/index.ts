import type { MigrationClass } from '@platform/persistence';
import { CreateUsers1795000100000 } from './1795000100000-CreateUsers.js';
import { CreateIdentityLookup1795000100001 } from './1795000100001-CreateIdentityLookup.js';

export const usersShardMigrations: readonly MigrationClass[] = [
  CreateUsers1795000100000,
];
export const usersCatalogMigrations: readonly MigrationClass[] = [
  CreateIdentityLookup1795000100001,
];
