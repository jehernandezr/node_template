import type { MigrationClass } from '@platform/persistence';
import { CreateDevices1795000400000 } from './1795000400000-CreateDevices.js';

export const devicesShardMigrations: readonly MigrationClass[] = [
  CreateDevices1795000400000,
];
