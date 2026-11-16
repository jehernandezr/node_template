import type { MigrationReport } from '@platform/persistence';
import type { MigrationTarget } from './migration-target.enum.js';

/** Resultado de `ServiceMigrator.run`: una entrada por base migrada, en el orden en que se migraron. */
export interface ServiceMigrationReport {
  readonly target: MigrationTarget;
  readonly databases: readonly MigrationReport[];
}
