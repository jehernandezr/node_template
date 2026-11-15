import type { MigrationClass } from '../model/database-set-definition.js';
import { PlatformAuditLog1794600000002 } from './platform-audit-log.migration.js';
import { PlatformFunctions1794600000001 } from './platform-functions.migration.js';

/** Migraciones de TypeORM propias de la capa para cada shard, en orden. Las suma el servicio a las suyas. */
export class PlatformPersistenceMigrations {
  static readonly shard: readonly MigrationClass[] = [
    PlatformFunctions1794600000001,
    PlatformAuditLog1794600000002,
  ];
}
