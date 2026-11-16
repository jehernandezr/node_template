import type { MigrationInterface } from 'typeorm';

/** Migración ficticia de shard del servicio; no ejecuta SQL. */
export class ServiceShardMigration1900000000010 implements MigrationInterface {
  readonly name = 'ServiceShardMigration1900000000010';

  async up(): Promise<void> {
    return Promise.resolve();
  }

  async down(): Promise<void> {
    return Promise.resolve();
  }
}
