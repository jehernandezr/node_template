import { Test } from '@nestjs/testing';
import type { RepositoryKit } from '@platform/persistence';
import { ConfigModule } from '@platform/config/nest';
import { PostgresHybridSearch } from '../../postgres/postgres-hybrid-search.js';
import { SearchIndexFactory } from '../../search-index-factory.js';
import { SearchMode } from '../../search-mode.enum.js';
import { HashingEmbeddingProvider } from '../../__tests__/utils/index.js';
import { SearchModule } from '../search.module.js';

describe('SearchModule', () => {
  it('wires the embedding provider into the hybrid index', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: { SEARCH_MODE: SearchMode.Hybrid } }),
        SearchModule.forRoot({ embeddings: HashingEmbeddingProvider }),
      ],
    }).compile();

    const index = moduleRef.get(SearchIndexFactory).create({} as RepositoryKit);

    expect(index).toBeInstanceOf(PostgresHybridSearch);
    await moduleRef.close();
  });

  it('does not start in hybrid mode without an embedding provider', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ env: { SEARCH_MODE: SearchMode.Hybrid } }),
          SearchModule.forRoot(),
        ],
      }).compile(),
    ).rejects.toThrow(/EmbeddingProvider/);
  });
});
