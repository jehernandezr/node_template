import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { CatalogDataSource } from '../catalog-data-source.js';
import { ShardDataSources } from '../shard-data-sources.js';

/**
 * Closes all `DataSource`s when the process shuts down. It goes in `onModuleDestroy`: work producers
 * stop earlier because their modules are imported after `PersistenceModule`.
 */
@Injectable()
export class PersistenceShutdownHook implements OnModuleDestroy {
  constructor(
    private readonly sources: ShardDataSources,
    private readonly catalog: CatalogDataSource,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.sources.close();
    await this.catalog.close();
  }
}
