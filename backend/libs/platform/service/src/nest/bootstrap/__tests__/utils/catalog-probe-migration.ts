import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Test catalog migration: creates a table that only serves to verify that it ran. */
export class CatalogProbeMigration1900000000001 implements MigrationInterface {
  readonly name = 'CatalogProbeMigration1900000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE service_catalog_probe (id int)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE service_catalog_probe');
  }
}
