import type { MigrationInterface, QueryRunner } from 'typeorm';
import { PlatformSchemaSql } from './platform-schema-sql.js';

/** `audit_log` de cada shard: particionada por mes, solo inserciones. Ver `PlatformSchemaSql`. */
export class PlatformAuditLog1794600000002 implements MigrationInterface {
  readonly name = PlatformSchemaSql.auditLogName;

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PlatformSchemaSql.auditLogUp) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PlatformSchemaSql.auditLogDown) {
      await queryRunner.query(statement);
    }
  }
}
