import type { MigrationClass } from '@platform/persistence';
import { CreatePasswordCredentials1795000200000 } from './1795000200000-CreatePasswordCredentials.js';
import { CreatePasswordResets1795000200001 } from './1795000200001-CreatePasswordResets.js';

export const passwordsShardMigrations: readonly MigrationClass[] = [
  CreatePasswordCredentials1795000200000,
  CreatePasswordResets1795000200001,
];
