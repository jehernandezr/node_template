import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Migración de prueba del catálogo: crea una tabla que solo sirve para verificar que corrió. */
export class CatalogProbeMigration1900000000001 implements MigrationInterface {
  readonly name = 'CatalogProbeMigration1900000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE service_catalog_probe (id int)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE service_catalog_probe');
  }
}
