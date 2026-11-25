import { TenantIsolationSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** RLS by `tenant_id` on the module's tenant tables. */
export class EnableApiKeysTenantIsolation1795001100002 implements MigrationInterface {
  readonly name = 'EnableApiKeysTenantIsolation1795001100002';

  private static readonly TABLES = ['service_accounts', 'api_keys'];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of EnableApiKeysTenantIsolation1795001100002.TABLES) {
      for (const statement of TenantIsolationSql.enable(table)) {
        await queryRunner.query(statement);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of EnableApiKeysTenantIsolation1795001100002.TABLES) {
      for (const statement of TenantIsolationSql.disable(table)) {
        await queryRunner.query(statement);
      }
    }
  }
}
