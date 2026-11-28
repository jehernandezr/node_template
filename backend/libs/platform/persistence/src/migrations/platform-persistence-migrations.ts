import type { MigrationClass } from '../model/database-set-definition.js';
import { PlatformAuditLog1794600000002 } from './platform-audit-log.migration.js';
import { PlatformFunctions1794600000001 } from './platform-functions.migration.js';
import { PlatformOwnerMaintenance1794600000003 } from './platform-owner-maintenance.migration.js';
import { PlatformPartitionGuard1794600000004 } from './platform-partition-guard.migration.js';

/** The layer's own TypeORM migrations for each shard, in order. The service adds them to its own. */
export class PlatformPersistenceMigrations {
  static readonly shard: readonly MigrationClass[] = [
    PlatformFunctions1794600000001,
    PlatformAuditLog1794600000002,
    PlatformOwnerMaintenance1794600000003,
    PlatformPartitionGuard1794600000004,
  ];
}
