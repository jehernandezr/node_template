import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Migración de prueba de los shards: crea una tabla que solo sirve para verificar que corrió. */
export class ShardProbeMigration1900000000002 implements MigrationInterface {
  readonly name = 'ShardProbeMigration1900000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE service_shard_probe (id int)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE service_shard_probe');
  }
}
