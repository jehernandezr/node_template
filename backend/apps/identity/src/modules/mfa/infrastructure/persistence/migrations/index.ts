import type { MigrationClass } from '@platform/persistence';
import { CreateMfaFactors1795000500000 } from './1795000500000-CreateMfaFactors.js';

export const mfaShardMigrations: readonly MigrationClass[] = [
  CreateMfaFactors1795000500000,
];
