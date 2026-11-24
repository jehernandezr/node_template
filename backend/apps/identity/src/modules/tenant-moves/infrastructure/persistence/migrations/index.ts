import type { MigrationClass } from '@platform/persistence';
import { CreateTenantMoves1795001300000 } from './1795001300000-CreateTenantMoves.js';

export const tenantMovesCatalogMigrations: readonly MigrationClass[] = [
  CreateTenantMoves1795001300000,
];
