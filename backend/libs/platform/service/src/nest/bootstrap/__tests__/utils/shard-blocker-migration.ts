import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración que falla cuando la tabla ya existe: sin `IF NOT EXISTS` a propósito, para forzar un fallo
 * parcial en la migración de un shard.
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
