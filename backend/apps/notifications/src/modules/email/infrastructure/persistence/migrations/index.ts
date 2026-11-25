import type { MigrationClass } from '@platform/persistence';
import { CreateEmailRecords1796100400000 } from './1796100400000-CreateEmailRecords.js';
import { ReserveEmailMessages1796100400001 } from './1796100400001-ReserveEmailMessages.js';

export const emailCatalogMigrations: readonly MigrationClass[] = [
  CreateEmailRecords1796100400000,
  ReserveEmailMessages1796100400001,
];
