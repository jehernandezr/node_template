import type { MigrationClass } from '@platform/persistence';
import { CreateTenantAccess1795000900000 } from './1795000900000-CreateTenantAccess.js';
import { EnableAccessTenantIsolation1795000900001 } from './1795000900001-EnableAccessTenantIsolation.js';
import { AllowMemberTombstoneMaintenance1795000900002 } from './1795000900002-AllowMemberTombstoneMaintenance.js';

export const accessShardMigrations: readonly MigrationClass[] = [
  CreateTenantAccess1795000900000,
  EnableAccessTenantIsolation1795000900001,
  AllowMemberTombstoneMaintenance1795000900002,
];
