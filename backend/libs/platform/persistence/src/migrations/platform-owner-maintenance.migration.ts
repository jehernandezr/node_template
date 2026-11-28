import type { MigrationInterface, QueryRunner } from 'typeorm';
import { PlatformSchemaSql } from './platform-schema-sql.js';

/** Partition maintenance with the rights of the table owner, for the app role. See `PlatformSchemaSql`. */
export class PlatformOwnerMaintenance1794600000003 implements MigrationInterface {
  readonly name = PlatformSchemaSql.ownerMaintenanceName;

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PlatformSchemaSql.ownerMaintenanceUp) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of PlatformSchemaSql.ownerMaintenanceDown) {
      await queryRunner.query(statement);
    }
  }
}
