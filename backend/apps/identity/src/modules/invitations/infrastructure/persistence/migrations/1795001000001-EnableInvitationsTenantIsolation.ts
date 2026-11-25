import { TenantIsolationSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** RLS by `tenant_id` on the module's tenant tables. */
export class EnableInvitationsTenantIsolation1795001000001 implements MigrationInterface {
  readonly name = 'EnableInvitationsTenantIsolation1795001000001';

  private static readonly TABLES = ['invitations'];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of EnableInvitationsTenantIsolation1795001000001.TABLES) {
      for (const statement of TenantIsolationSql.enable(table)) {
        await queryRunner.query(statement);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of EnableInvitationsTenantIsolation1795001000001.TABLES) {
      for (const statement of TenantIsolationSql.disable(table)) {
        await queryRunner.query(statement);
      }
    }
  }
}
