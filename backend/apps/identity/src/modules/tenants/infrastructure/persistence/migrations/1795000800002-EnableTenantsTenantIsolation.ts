import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TenantIsolationSql } from '../../../../../database/tenant-isolation-sql.js';

/** RLS por `tenant_id` en las tablas de tenant del módulo. */
export class EnableTenantsTenantIsolation1795000800002 implements MigrationInterface {
  readonly name = 'EnableTenantsTenantIsolation1795000800002';

  private static readonly TABLES = ['tenants'];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of EnableTenantsTenantIsolation1795000800002.TABLES) {
      for (const statement of TenantIsolationSql.enable(table)) {
        await queryRunner.query(statement);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of EnableTenantsTenantIsolation1795000800002.TABLES) {
      for (const statement of TenantIsolationSql.disable(table)) {
        await queryRunner.query(statement);
      }
    }
  }
}
