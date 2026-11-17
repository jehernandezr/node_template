import type { MigrationClass } from '@platform/persistence';
import { CreateSessions1795000700000 } from './1795000700000-CreateSessions.js';

export const sessionsShardMigrations: readonly MigrationClass[] = [
  CreateSessions1795000700000,
];
