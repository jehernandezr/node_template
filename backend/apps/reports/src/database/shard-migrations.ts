import type { MigrationClass } from '@platform/persistence';
import { projectionShardMigrations } from '../modules/projections/infrastructure/persistence/migrations/index.js';
import { runShardMigrations } from '../modules/runs/infrastructure/persistence/migrations/index.js';
// generated:modules:imports

/** Migrations of the reports shards, in module order. */
export const reportsShardMigrations: readonly MigrationClass[] = [
  ...runShardMigrations,
  ...projectionShardMigrations,
  // generated:modules
];
