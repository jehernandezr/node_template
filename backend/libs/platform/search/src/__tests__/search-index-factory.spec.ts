import type { RepositoryKit } from '@platform/persistence';
import { PostgresHybridSearch } from '../postgres/postgres-hybrid-search.js';
import { PostgresTextSearch } from '../postgres/postgres-text-search.js';
import { SearchIndexFactory } from '../search-index-factory.js';
import { SearchLanguage } from '../search-language.enum.js';
import { SearchMode } from '../search-mode.enum.js';
import { HashingEmbeddingProvider } from './utils/index.js';

const kit = {} as RepositoryKit;

describe('SearchIndexFactory', () => {
  it('builds the text index in text mode, even with an embedding provider', () => {
    const factory = new SearchIndexFactory(
      { SEARCH_MODE: SearchMode.Text, SEARCH_LANGUAGE: SearchLanguage.Spanish },
      new HashingEmbeddingProvider(),
    );

    expect(factory.create(kit)).toBeInstanceOf(PostgresTextSearch);
  });

  it('builds the hybrid index in hybrid mode', () => {
    const factory = new SearchIndexFactory(
      {
        SEARCH_MODE: SearchMode.Hybrid,
        SEARCH_LANGUAGE: SearchLanguage.Spanish,
      },
      new HashingEmbeddingProvider(),
    );

    expect(factory.create(kit)).toBeInstanceOf(PostgresHybridSearch);
  });

  it('refuses hybrid mode without an embedding provider', () => {
    expect(
      () =>
        new SearchIndexFactory({
          SEARCH_MODE: SearchMode.Hybrid,
          SEARCH_LANGUAGE: SearchLanguage.Spanish,
        }),
    ).toThrow(/EmbeddingProvider/);
  });
});
