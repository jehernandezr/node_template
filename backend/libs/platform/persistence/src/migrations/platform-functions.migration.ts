import type { MigrationInterface, QueryRunner } from 'typeorm';
import { PlatformSchemaSql } from './platform-schema-sql.js';

/** Platform functions on each shard (UUIDv7, partitions, audit). See `PlatformSchemaSql`. */
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
