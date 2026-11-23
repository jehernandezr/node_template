import type { MigrationClass } from '@platform/persistence';
import { CreateSubscriptions1796200200000 } from './1796200200000-CreateSubscriptions.js';

export const subscriptionShardMigrations: readonly MigrationClass[] = [
  CreateSubscriptions1796200200000,
];
