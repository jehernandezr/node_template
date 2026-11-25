import type { MigrationClass } from '@platform/persistence';
import { CreateLoginAttempts1795000300000 } from './1795000300000-CreateLoginAttempts.js';
import { RecordUnknownSignInAttempts1795000300001 } from './1795000300001-RecordUnknownSignInAttempts.js';

export const authenticationShardMigrations: readonly MigrationClass[] = [
  CreateLoginAttempts1795000300000,
  RecordUnknownSignInAttempts1795000300001,
];
