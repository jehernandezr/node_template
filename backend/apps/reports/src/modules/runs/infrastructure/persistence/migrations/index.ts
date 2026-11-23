import type { MigrationClass } from '@platform/persistence';
import { CreateReportRuns1796300100000 } from './1796300100000-CreateReportRuns.js';

export const runShardMigrations: readonly MigrationClass[] = [
  CreateReportRuns1796300100000,
];
