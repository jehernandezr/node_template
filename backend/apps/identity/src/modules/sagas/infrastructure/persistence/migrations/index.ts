import type { MigrationClass } from '@platform/persistence';
import { CreateIdentitySagas1795001200000 } from './1795001200000-CreateIdentitySagas.js';

export const sagasCatalogMigrations: readonly MigrationClass[] = [
  CreateIdentitySagas1795001200000,
];
