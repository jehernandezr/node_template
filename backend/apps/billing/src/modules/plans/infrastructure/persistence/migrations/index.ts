import type { MigrationClass } from '@platform/persistence';
import { CreatePlans1796200100000 } from './1796200100000-CreatePlans.js';

export const planCatalogMigrations: readonly MigrationClass[] = [
  CreatePlans1796200100000,
];
