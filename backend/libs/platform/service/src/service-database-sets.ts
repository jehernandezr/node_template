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
  /** The platform ones go first: their migrations have the lowest timestamps. */
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
