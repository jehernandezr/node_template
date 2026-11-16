import type { MigrationInterface } from 'typeorm';

/** Migración ficticia del catálogo del servicio; no ejecuta SQL. */
export class ServiceCatalogMigration1900000000011 implements MigrationInterface {
  readonly name = 'ServiceCatalogMigration1900000000011';

  async up(): Promise<void> {
    return Promise.resolve();
  }

  async down(): Promise<void> {
    return Promise.resolve();
  }
}
