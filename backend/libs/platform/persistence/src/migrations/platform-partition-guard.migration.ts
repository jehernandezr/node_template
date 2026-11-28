import type { MigrationInterface, QueryRunner } from 'typeorm';
import { PlatformSchemaSql } from './platform-schema-sql.js';

/** Partition functions limited to registered tables and kept from `PUBLIC`. See `PlatformSchemaSql`. */
export class PlatformPartitionGuard1794600000004 implements MigrationInterface {
  readonly name = PlatformSchemaSql.partitionGuardName;

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PlatformSchemaSql.partitionGuardUp) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PlatformSchemaSql.partitionGuardDown) {
      await queryRunner.query(statement);
    }
  }
}
