import type { DatabaseSetDefinition } from '@platform/persistence';

/**
 * The service's own entities and migrations, one per database class. They are the
 * reference definitions with which the TypeORM `DataSource`s are created;
 * the platform adds its own (`ServiceDatabaseSets`).
 */
export interface ServiceMigrations {
  readonly catalog: DatabaseSetDefinition;
  readonly shard: DatabaseSetDefinition;
}
