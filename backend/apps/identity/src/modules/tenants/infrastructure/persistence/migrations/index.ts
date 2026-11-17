import type { MigrationClass } from '@platform/persistence';
import { CreateTenants1795000800000 } from './1795000800000-CreateTenants.js';
import { CreateTenantLookup1795000800001 } from './1795000800001-CreateTenantLookup.js';
import { EnableTenantsTenantIsolation1795000800002 } from './1795000800002-EnableTenantsTenantIsolation.js';

export const tenantsShardMigrations: readonly MigrationClass[] = [
  CreateTenants1795000800000,
  EnableTenantsTenantIsolation1795000800002,
];
export const tenantsCatalogMigrations: readonly MigrationClass[] = [
  CreateTenantLookup1795000800001,
];
