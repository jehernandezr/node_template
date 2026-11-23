import type { MigrationClass } from '@platform/persistence';
import { taskModuleShardMigrations } from '../modules/tasks/infrastructure/persistence/migrations/index.js';

/** Migraciones de los shards de tasks, en el orden de los módulos. */
export const tasksShardMigrations: readonly MigrationClass[] = [
  ...taskModuleShardMigrations,
];
