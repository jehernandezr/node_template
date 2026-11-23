import type { MigrationClass } from '@platform/persistence';
import { CreateEmailRecords1796100400000 } from './1796100400000-CreateEmailRecords.js';

export const emailCatalogMigrations: readonly MigrationClass[] = [
  CreateEmailRecords1796100400000,
];
