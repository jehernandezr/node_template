import type { MigrationInterface, QueryRunner } from 'typeorm';
import { LedgerSchema } from '../../../__tests__/utils/index.js';

/** Las tablas del servicio de prueba en cada shard; la barrera la crean las migraciones de la plataforma. */
export class LedgerShardMigration1900000000030 implements MigrationInterface {
  readonly name = 'LedgerShardMigration1900000000030';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of LedgerSchema.TABLES) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE entries');
    await queryRunner.query('DROP TABLE ledgers');
  }
}
