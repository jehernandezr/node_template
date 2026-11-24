import type { MigrationInterface, QueryRunner } from 'typeorm';

/** La tabla de la barrera de traslado, que en un servicio crean las migraciones de shard de la plataforma. */
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
