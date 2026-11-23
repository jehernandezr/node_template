import type { MigrationClass } from '@platform/persistence';
import { CreateTasks1796000100000 } from './1796000100000-CreateTasks.js';
import { CreateTaskSearchDocuments1796000100001 } from './1796000100001-CreateTaskSearchDocuments.js';

export const taskModuleShardMigrations: readonly MigrationClass[] = [
  CreateTasks1796000100000,
  CreateTaskSearchDocuments1796000100001,
];
