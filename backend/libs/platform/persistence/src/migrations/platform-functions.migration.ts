import type { MigrationInterface, QueryRunner } from 'typeorm';
import { PlatformSchemaSql } from './platform-schema-sql.js';

/** Funciones de la plataforma en cada shard (UUIDv7, particiones, auditoría). Ver `PlatformSchemaSql`. */
export class PlatformFunctions1794600000001 implements MigrationInterface {
  readonly name = PlatformSchemaSql.functionsName;

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PlatformSchemaSql.functionsUp) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PlatformSchemaSql.functionsDown) {
      await queryRunner.query(statement);
    }
  }
}
