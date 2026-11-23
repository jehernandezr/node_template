import type { RepositoryKit } from '@platform/persistence';
import type { EmbeddingProvider } from './embedding-provider.js';
import { PostgresHybridSearch } from './postgres/postgres-hybrid-search.js';
import { PostgresTextSearch } from './postgres/postgres-text-search.js';
import type { SearchIndex } from './search-index.js';
import { SearchMode } from './search-mode.enum.js';
import type { SearchSettings } from './search.config.js';

/**
 * Arma el `SearchIndex` de un módulo con su `RepositoryKit`, en el modo de `SEARCH_MODE`. El modo híbrido
 * exige un `EmbeddingProvider`: sin él el servicio no arranca, en vez de buscar en silencio solo por texto.
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
