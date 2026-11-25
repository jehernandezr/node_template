import { TenantIsolationSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a maintenance transaction reach `tenant_members` of every tenant of the shard: the erasure of an account
 * deletes the tombstones its earlier removals left in tenants it no longer belongs to.
 */
export class AllowMemberTombstoneMaintenance1795000900002 implements MigrationInterface {
  readonly name = 'AllowMemberTombstoneMaintenance1795000900002';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of TenantIsolationSql.allowMaintenance(
      'tenant_members',
    )) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of TenantIsolationSql.disallowMaintenance(
      'tenant_members',
    )) {
      await queryRunner.query(statement);
    }
  }
}
