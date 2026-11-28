import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TenantIsolationSql } from '../../migrations/tenant-isolation-sql.js';

/** Turns on tenant RLS on `probes`, as a service migration does for its tenant tables. */
export class IsolateProbes1794700000002 implements MigrationInterface {
  readonly name = 'IsolateProbes1794700000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of TenantIsolationSql.enable('probes')) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of TenantIsolationSql.disable('probes')) {
      await queryRunner.query(statement);
    }
  }
}
