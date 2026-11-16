import { Module } from '@nestjs/common';
import { CatalogDataSource, ShardDataSources } from '@platform/persistence';
import { DirectoryShardLister } from '@platform/adapters-postgres';
import { CatalogHealthCheck } from './catalog-health-check.js';
import { HealthEndpoints } from './health-endpoints.controller.js';
import { HealthRegistrar } from './health-registrar.js';
import { ShardsHealthCheck } from './shards-health-check.js';

/**
 * Salud del servicio. `HealthRegistry` viene de `ObservabilityModule`; `CatalogDataSource` y
 * `ShardDataSources`, de `PersistenceModule`; `DirectoryShardLister`, de `PostgresPlatformModule`.
 * Todos son globales, así que este módulo no los importa.
 */
@Module({
  controllers: [HealthEndpoints],
  providers: [
    {
      provide: CatalogHealthCheck,
      useFactory: (catalog: CatalogDataSource) =>
        new CatalogHealthCheck(catalog),
      inject: [CatalogDataSource],
    },
    {
      provide: ShardsHealthCheck,
      useFactory: (lister: DirectoryShardLister, sources: ShardDataSources) =>
        new ShardsHealthCheck(lister, sources),
      inject: [DirectoryShardLister, ShardDataSources],
    },
    HealthRegistrar,
  ],
})
export class HealthModule {}
