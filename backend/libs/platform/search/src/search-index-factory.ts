import type { RepositoryKit } from '@platform/persistence';
import type { EmbeddingProvider } from './embedding-provider.js';
import { PostgresHybridSearch } from './postgres/postgres-hybrid-search.js';
import { PostgresTextSearch } from './postgres/postgres-text-search.js';
import type { SearchIndex } from './search-index.js';
import { SearchMode } from './search-mode.enum.js';
import type { SearchSettings } from './search.config.js';

/**
 * Builds a module's `SearchIndex` with its `RepositoryKit`, in the `SEARCH_MODE` mode. Hybrid mode
 * requires an `EmbeddingProvider`: without it the service does not start, instead of silently searching by text only.
 */
export class SearchIndexFactory {
  constructor(
    private readonly settings: SearchSettings,
    private readonly embeddings?: EmbeddingProvider,
  ) {
    if (
      settings.SEARCH_MODE === SearchMode.Hybrid &&
      embeddings === undefined
    ) {
      throw new Error('SEARCH_MODE=hybrid requires an EmbeddingProvider');
    }
  }

  create(kit: RepositoryKit): SearchIndex {
    if (
      this.settings.SEARCH_MODE === SearchMode.Text ||
      this.embeddings === undefined
    ) {
      return new PostgresTextSearch(kit, this.settings.SEARCH_LANGUAGE);
    }
    return new PostgresHybridSearch(
      kit,
      this.settings.SEARCH_LANGUAGE,
      this.embeddings,
    );
  }
}
