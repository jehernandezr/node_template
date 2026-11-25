import type { MigrationInterface, QueryRunner } from 'typeorm';
import { SearchSchema } from '../../search-schema.js';

/** Creates `search_documents` as a service migration does, with the extension that provisions the database. */
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
