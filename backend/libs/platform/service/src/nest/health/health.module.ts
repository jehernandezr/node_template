import { Module } from '@nestjs/common';
import { CatalogDataSource, ShardDataSources } from '@platform/persistence';
import { DirectoryShardLister } from '@platform/adapters-postgres';
import { CatalogHealthCheck } from './catalog-health-check.js';
import { HealthEndpoints } from './health-endpoints.controller.js';
import { HealthRegistrar } from './health-registrar.js';
import { ShardsHealthCheck } from './shards-health-check.js';

/**
 * Service health. `HealthRegistry` comes from `ObservabilityModule`; `CatalogDataSource` and
 * `ShardDataSources`, from `PersistenceModule`; `DirectoryShardLister`, from `PostgresPlatformModule`.
 * All of them are global, so this module does not import them.
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
