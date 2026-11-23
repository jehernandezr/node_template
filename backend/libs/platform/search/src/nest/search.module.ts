import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { EmbeddingProvider } from '../embedding-provider.js';
import { SearchIndexFactory } from '../search-index-factory.js';
import { SearchConfig, type SearchSettings } from '../search.config.js';
import type { SearchModuleOptions } from './search-module-options.js';

/**
 * Configuración de búsqueda y `SearchIndexFactory`, globales. El `SearchIndex` lo provee cada módulo de
 * negocio con su `RepositoryKit`, porque el índice escribe en el shard de ese módulo.
 */
@Module({})
export class SearchModule {
  static forRoot(options: SearchModuleOptions = {}): DynamicModule {
    const embeddings: Provider[] =
      options.embeddings === undefined
        ? []
        : [{ provide: EmbeddingProvider, useClass: options.embeddings }];
    return {
      module: SearchModule,
      global: true,
      imports: [ConfigModule.forFeature(SearchConfig)],
      providers: [
        ...embeddings,
        {
          provide: SearchIndexFactory,
          useFactory: (
            settings: SearchSettings,
            provider?: EmbeddingProvider,
          ) => new SearchIndexFactory(settings, provider),
          inject: [
            SearchConfig.token,
            { token: EmbeddingProvider, optional: true },
          ],
        },
      ],
      exports: [SearchIndexFactory],
    };
  }
}
