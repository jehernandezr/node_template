import {
  platformCatalogEntities,
  platformCatalogMigrations,
  platformSagaShardEntities,
  platformSagaShardMigrations,
  platformShardEntities,
  platformShardMigrations,
} from '@platform/adapters-postgres';
import type { DatabaseSetDefinition } from '@platform/persistence';
import type { ServiceMigrations } from './service-migrations.js';

/**
 * Adds the platform table entities and migrations to the service ones, including the saga
 * journal: the runtime mounts `SagaModule` in every service and its recovery reads it in each shard at startup.
 */
export class ServiceDatabaseSets {
  /**
   * Merges the platform tables and migrations with the service's ones.
   * The platform ones go first: their migrations have the lowest timestamps.
   * @param service Migrations and entities of the service.
   * @returns The shard and catalog sets.
   */
  merge(service: ServiceMigrations): {
    readonly shard: DatabaseSetDefinition;
    readonly catalog: DatabaseSetDefinition;
  } {
    return {
      shard: {
        entities: [
          ...platformShardEntities,
          ...platformSagaShardEntities,
          ...service.shard.entities,
        ],
        migrations: [
          ...platformShardMigrations,
          ...platformSagaShardMigrations,
          ...service.shard.migrations,
        ],
      },
      catalog: {
        entities: [...platformCatalogEntities, ...service.catalog.entities],
        migrations: [
          ...platformCatalogMigrations,
          ...service.catalog.migrations,
        ],
      },
    };
  }
}
