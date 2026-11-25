import { TenantIsolationSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** RLS by `tenant_id` on the module's tenant tables. */
export class EnableAccessTenantIsolation1795000900001 implements MigrationInterface {
  readonly name = 'EnableAccessTenantIsolation1795000900001';

  private static readonly TABLES = [
    'tenant_members',
    'groups',
    'roles',
    'tenant_access_versions',
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of EnableAccessTenantIsolation1795000900001.TABLES) {
      for (const statement of TenantIsolationSql.enable(table)) {
        await queryRunner.query(statement);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of EnableAccessTenantIsolation1795000900001.TABLES) {
      for (const statement of TenantIsolationSql.disable(table)) {
        await queryRunner.query(statement);
      }
    }
  }
}
