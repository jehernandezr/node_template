import type { MigrationInterface, QueryRunner } from 'typeorm';
import { LedgerSchema } from '../../../__tests__/utils/index.js';

/** The test service tables on each shard; the platform migrations create the fence. */
export class LedgerShardMigration1900000000030 implements MigrationInterface {
  readonly name = 'LedgerShardMigration1900000000030';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of LedgerSchema.TABLES) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE attempts');
    await queryRunner.query('DROP TABLE postings');
    await queryRunner.query('DROP TABLE entries');
    await queryRunner.query('DROP TABLE ledgers');
  }
}
