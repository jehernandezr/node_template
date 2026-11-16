import {
  platformCatalogEntities,
  platformCatalogMigrations,
  platformShardEntities,
  platformShardMigrations,
} from '@platform/adapters-postgres';
import type { DatabaseSetDefinition } from '@platform/persistence';
import type { ServiceMigrations } from './service-migrations.js';

/** Suma a las entidades y migraciones del servicio las de las tablas de la plataforma. */
export class ServiceDatabaseSets {
  /** Las plataforma van primero: sus migraciones tienen los timestamps más bajos. */
  merge(service: ServiceMigrations): {
    readonly shard: DatabaseSetDefinition;
    readonly catalog: DatabaseSetDefinition;
  } {
    return {
      shard: {
        entities: [...platformShardEntities, ...service.shard.entities],
        migrations: [...platformShardMigrations, ...service.shard.migrations],
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
