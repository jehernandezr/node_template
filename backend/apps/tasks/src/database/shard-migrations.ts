import type { MigrationClass } from '@platform/persistence';
import { taskModuleShardMigrations } from '../modules/tasks/infrastructure/persistence/migrations/index.js';
// generated:modules:imports

/** Migrations of the tasks shards, in module order. */
export const tasksShardMigrations: readonly MigrationClass[] = [
  ...taskModuleShardMigrations,
  // generated:modules
];
