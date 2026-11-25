import type { MigrationInterface, QueryRunner } from 'typeorm';

/** The relocation barrier table, which in a service is created by the platform shard migrations. */
export class CreateTenantWriteFences1794700000002 implements MigrationInterface {
  readonly name = 'CreateTenantWriteFences1794700000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE tenant_write_fences (tenant_id text PRIMARY KEY, move_id text NOT NULL, created_at timestamptz NOT NULL, switched_at timestamptz)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE tenant_write_fences');
  }
}
