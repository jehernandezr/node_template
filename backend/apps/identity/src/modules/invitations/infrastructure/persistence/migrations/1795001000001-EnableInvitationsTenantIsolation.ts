import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TenantIsolationSql } from '../../../../../database/tenant-isolation-sql.js';

/** RLS por `tenant_id` en las tablas de tenant del módulo. */
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
