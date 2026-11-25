import type { MigrationReport } from '@platform/persistence';
import type { MigrationTarget } from './migration-target.enum.js';

/** Result of `ServiceMigrator.run`: one entry per migrated database, in the order they were migrated. */
export interface ServiceMigrationReport {
  readonly target: MigrationTarget;
  readonly databases: readonly MigrationReport[];
}
