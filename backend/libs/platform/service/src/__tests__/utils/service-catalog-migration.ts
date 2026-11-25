import type { MigrationInterface } from 'typeorm';

/** Dummy migration of the service catalog; runs no SQL. */
export class ServiceCatalogMigration1900000000011 implements MigrationInterface {
  readonly name = 'ServiceCatalogMigration1900000000011';

  async up(): Promise<void> {
    return Promise.resolve();
  }

  async down(): Promise<void> {
    return Promise.resolve();
  }
}
