import { ContainerRuntime } from '@platform/kernel/test-utils';
import { PostgresHybridSearch } from '../postgres/postgres-hybrid-search.js';
import { PostgresTextSearch } from '../postgres/postgres-text-search.js';
import { SearchLanguage } from '../search-language.enum.js';
import {
  HashingEmbeddingProvider,
  runSearchIndexContract,
  SearchTestDatabase,
} from './utils/index.js';

new ContainerRuntime(process.env).describeIfAvailable(
  'SearchIndex adapters on PostgreSQL with pgvector',
  () => {
    jest.setTimeout(300_000);
    const database = new SearchTestDatabase();

    beforeAll(async () => {
      await database.start();
    });

    afterAll(async () => {
      await database.stop();
    });

    runSearchIndexContract(
      'PostgresTextSearch',
      () => database,
      (db) => new PostgresTextSearch(db.kit(), SearchLanguage.Spanish),
    );

    runSearchIndexContract(
      'PostgresHybridSearch',
      () => database,
      (db) =>
        new PostgresHybridSearch(
          db.kit(),
          SearchLanguage.Spanish,
          new HashingEmbeddingProvider(),
        ),
    );

    describe('text mode', () => {
      const collection = 'text-only';
      const index = () =>
        new PostgresTextSearch(database.kit(), SearchLanguage.Spanish);

      it('returns nothing when no document holds the words', async () => {
        const search = index();
        await database.inTransaction(SearchTestDatabase.TENANT_A, () =>
          search.index({
            collection,
            id: '0193f1c2-0000-7000-8000-000000000201',
            text: 'Revisar el contrato',
          }),
        );

        const hits = await database.inTenant(SearchTestDatabase.TENANT_A, () =>
          search.search({ collection, text: 'jardín', limit: 10, offset: 0 }),
        );

        expect(hits).toEqual([]);
      });
    });

    describe('hybrid mode', () => {
      const collection = 'hybrid-only';
      const index = () =>
        new PostgresHybridSearch(
          database.kit(),
          SearchLanguage.Spanish,
          new HashingEmbeddingProvider(),
        );

      it('still returns semantic neighbours when no document holds the exact words', async () => {
        const search = index();
        const id = '0193f1c2-0000-7000-8000-000000000301';
        await database.inTransaction(SearchTestDatabase.TENANT_A, () =>
          search.index({ collection, id, text: 'Revisar el contrato anual' }),
        );

        const hits = await database.inTenant(SearchTestDatabase.TENANT_A, () =>
          search.search({
            collection,
            text: 'contrato anual pendiente',
            limit: 10,
            offset: 0,
          }),
        );

        expect(hits.map((hit) => hit.id)).toEqual([id]);
      });

      it('refuses a provider whose vectors do not fit the table', () => {
        const narrow = Object.assign(new HashingEmbeddingProvider(), {
          dimensions: 3,
        });

        expect(
          () =>
            new PostgresHybridSearch(
              database.kit(),
              SearchLanguage.Spanish,
              narrow,
            ),
        ).toThrow(/dimensions/);
      });
    });
  },
);
