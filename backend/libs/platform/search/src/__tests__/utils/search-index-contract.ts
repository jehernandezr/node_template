import type { SearchIndex } from '../../search-index.js';
import { SearchTestDatabase } from './search-test-database.js';

const ids = {
  invoice: '0193f1c2-0000-7000-8000-000000000101',
  meeting: '0193f1c2-0000-7000-8000-000000000102',
  garden: '0193f1c2-0000-7000-8000-000000000103',
  foreign: '0193f1c2-0000-7000-8000-000000000104',
};

/**
 * Lo que todo `SearchIndex` cumple sobre la base real, sea de texto o híbrido. `database` devuelve la base
 * ya iniciada y `create` arma el adaptador con su kit. Cada adaptador usa su propia colección.
 */
export function runSearchIndexContract(
  name: string,
  database: () => SearchTestDatabase,
  create: (database: SearchTestDatabase) => SearchIndex,
): void {
  describe(`${name} (SearchIndex contract)`, () => {
    const collection = `notes-${name}`;
    let index: SearchIndex;

    const writeAsTenantA = <T>(fn: () => Promise<T>): Promise<T> =>
      database().inTransaction(SearchTestDatabase.TENANT_A, fn);

    const search = (text: string, limit = 10, offset = 0) =>
      database().inTenant(SearchTestDatabase.TENANT_A, () =>
        index.search({ collection, text, limit, offset }),
      );

    const idsOf = (hits: readonly { id: string }[]): string[] =>
      hits.map((hit) => hit.id);

    beforeAll(async () => {
      index = create(database());
      await writeAsTenantA(async () => {
        await index.index({
          collection,
          id: ids.invoice,
          text: 'Enviar la factura del cliente de marzo',
        });
        await index.index({
          collection,
          id: ids.meeting,
          text: 'Preparar la reunión con el cliente',
        });
        await index.index({
          collection,
          id: ids.garden,
          text: 'Regar las plantas del jardín',
        });
      });
      await database().inTransaction(SearchTestDatabase.TENANT_B, () =>
        index.index({
          collection,
          id: ids.foreign,
          text: 'Factura de otro tenant',
        }),
      );
    });

    it('ranks first the document that holds every searched word', async () => {
      const hits = await search('factura cliente');

      expect(hits[0]?.id).toBe(ids.invoice);
    });

    it('finds a word by its stem in the configured language', async () => {
      const hits = await search('facturas');

      expect(idsOf(hits)).toContain(ids.invoice);
    });

    it('never returns documents of another tenant or another collection', async () => {
      const hits = await search('factura');
      const otherCollection = await database().inTenant(
        SearchTestDatabase.TENANT_A,
        () =>
          index.search({
            collection: 'elsewhere',
            text: 'factura',
            limit: 10,
            offset: 0,
          }),
      );

      expect(idsOf(hits)).not.toContain(ids.foreign);
      expect(otherCollection).toEqual([]);
    });

    it('pages with limit and offset without repeating hits', async () => {
      const all = await search('cliente factura reunión');
      const first = await search('cliente factura reunión', 1, 0);
      const second = await search('cliente factura reunión', 1, 1);

      expect([...first, ...second]).toEqual(all.slice(0, 2));
    });

    it('searches the new text after a document is indexed again', async () => {
      await writeAsTenantA(() =>
        index.index({
          collection,
          id: ids.garden,
          text: 'Podar el rosal del patio',
        }),
      );

      const hits = await search('rosal');

      expect(hits[0]?.id).toBe(ids.garden);
    });

    it('forgets a removed document', async () => {
      await writeAsTenantA(() => index.remove(collection, ids.meeting));

      const hits = await search('reunión');

      expect(idsOf(hits)).not.toContain(ids.meeting);
    });
  });
}
