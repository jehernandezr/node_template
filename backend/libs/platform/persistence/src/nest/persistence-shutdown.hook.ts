import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { CatalogDataSource } from '../catalog-data-source.js';
import { ShardDataSources } from '../shard-data-sources.js';

/**
 * Cierra todos los `DataSource` al apagar el proceso. Va en `onModuleDestroy`: los productores de trabajo se
 * detienen antes porque sus módulos se importan después de `PersistenceModule`.
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
