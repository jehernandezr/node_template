import type { MigrationClass } from '@platform/persistence';
import { CreateLoginAttempts1795000300000 } from './1795000300000-CreateLoginAttempts.js';

export const authenticationShardMigrations: readonly MigrationClass[] = [
  CreateLoginAttempts1795000300000,
];
