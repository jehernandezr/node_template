import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Test shard migration: creates a table that only serves to verify that it ran. */
export class ShardProbeMigration1900000000002 implements MigrationInterface {
  readonly name = 'ShardProbeMigration1900000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE service_shard_probe (id int)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE service_shard_probe');
  }
}
