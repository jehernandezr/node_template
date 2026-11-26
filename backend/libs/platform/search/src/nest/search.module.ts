import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { EmbeddingProvider } from '../embedding-provider.js';
import { SearchIndexFactory } from '../search-index-factory.js';
import { SearchConfig, type SearchSettings } from '../search.config.js';
import type { SearchModuleOptions } from './search-module-options.js';

/**
 * Global search configuration and `SearchIndexFactory`. Each business module provides the `SearchIndex` with
 * its `RepositoryKit`, because the index writes to that module's shard.
 */
@Module({})
export class SearchModule {
  /**
   * Registers the search index factory of the configured mode.
   * @param options Search mode and language.
   * @returns The module.
   */
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
