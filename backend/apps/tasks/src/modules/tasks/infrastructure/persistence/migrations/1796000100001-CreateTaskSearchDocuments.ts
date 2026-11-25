import { TenantIsolationSql } from '@platform/persistence';
import { SearchSchema } from '@platform/search';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Task search index, with RLS per tenant like the tasks. */
export class CreateTaskSearchDocuments1796000100001 implements MigrationInterface {
  readonly name = 'CreateTaskSearchDocuments1796000100001';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of [
      ...SearchSchema.create(),
      ...TenantIsolationSql.enable(SearchSchema.TABLE),
    ]) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of [
      ...TenantIsolationSql.disable(SearchSchema.TABLE),
      ...SearchSchema.drop(),
    ]) {
      await queryRunner.query(statement);
    }
  }
}
