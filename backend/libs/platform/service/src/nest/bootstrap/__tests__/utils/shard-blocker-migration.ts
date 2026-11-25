import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration that fails when the table already exists: deliberately without `IF NOT EXISTS`, to force a partial
 * failure in the migration of a shard.
 */
export class ShardBlockerMigration1900000000003 implements MigrationInterface {
  readonly name = 'ShardBlockerMigration1900000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE service_shard_blocker (id int)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE service_shard_blocker');
  }
}
