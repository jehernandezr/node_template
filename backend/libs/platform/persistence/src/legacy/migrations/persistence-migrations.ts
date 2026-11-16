import { PlatformSchemaSql } from '../../migrations/platform-schema-sql.js';
import type { SqlMigration } from './sql-migration.js';

export const PlatformFunctionsMigration: SqlMigration = {
  name: PlatformSchemaSql.functionsName,
  up: PlatformSchemaSql.functionsUp,
  down: PlatformSchemaSql.functionsDown,
};

export const AuditLogMigration: SqlMigration = {
  name: PlatformSchemaSql.auditLogName,
  up: PlatformSchemaSql.auditLogUp,
  down: PlatformSchemaSql.auditLogDown,
};

/**
 * Migraciones propias de la capa en cada shard, en orden: funciones de la
 * plataforma y `audit_log`. Las tablas de los adaptadores (idempotencia,
 * outbox) viven en `@platform/adapters-postgres`.
 */
export const persistenceMigrations: readonly SqlMigration[] = [
  PlatformFunctionsMigration,
  AuditLogMigration,
];
