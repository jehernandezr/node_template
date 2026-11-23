import type { MigrationInterface, QueryRunner } from 'typeorm';
import { SearchSchema } from '../../search-schema.js';

/** Crea `search_documents` como lo hace la migración de un servicio, con la extensión que provisiona la base. */
export class CreateSearchDocuments1794800000001 implements MigrationInterface {
  readonly name = 'CreateSearchDocuments1794800000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');
    for (const statement of SearchSchema.create()) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of SearchSchema.drop()) {
      await queryRunner.query(statement);
    }
  }
}
