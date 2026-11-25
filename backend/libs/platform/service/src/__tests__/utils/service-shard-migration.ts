import type { MigrationInterface } from 'typeorm';

/** Dummy shard migration of the service; runs no SQL. */
export class ServiceShardMigration1900000000010 implements MigrationInterface {
  readonly name = 'ServiceShardMigration1900000000010';

  async up(): Promise<void> {
    return Promise.resolve();
  }

  async down(): Promise<void> {
    return Promise.resolve();
  }
}
