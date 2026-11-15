import { DatabaseKind } from '../model/database-kind.enum.js';
import { CatalogDataSource } from '../catalog-data-source.js';
import { FakeDataSourceFactory } from './utils/fake-data-source-factory.js';
import { FakeInstanceEndpointResolver } from './utils/fake-instance-endpoint-resolver.js';

const SETTINGS = {
  DB_CATALOG_NAME: 'svc_catalog',
  DB_CATALOG_INSTANCE: 'catalog-instance',
};

function buildCatalog(factory: FakeDataSourceFactory): CatalogDataSource {
  return new CatalogDataSource(
    factory,
    new FakeInstanceEndpointResolver(),
    SETTINGS,
  );
}

describe('CatalogDataSource', () => {
  describe('when asked for the catalog twice', () => {
    it('creates one catalog DataSource with the catalog kind and settings', async () => {
      const factory = new FakeDataSourceFactory();
      const catalog = buildCatalog(factory);

      const first = await catalog.get();
      const second = await catalog.get();

      expect(second).toBe(first);
      expect(factory.created).toHaveLength(1);
      expect(factory.targets[0]).toEqual({
        kind: DatabaseKind.Catalog,
        instance: 'catalog-instance',
        database: 'svc_catalog',
      });
    });
  });

  describe('when the first initialization fails', () => {
    it('creates a new DataSource on the next call', async () => {
      const factory = new FakeDataSourceFactory();
      factory.failNext(1);
      const catalog = buildCatalog(factory);

      await expect(catalog.get()).rejects.toThrow('initialize failed');
      await catalog.get();

      expect(factory.created).toHaveLength(2);
    });
  });

  describe('when closed twice', () => {
    it('destroys the DataSource once', async () => {
      const factory = new FakeDataSourceFactory();
      const catalog = buildCatalog(factory);
      await catalog.get();

      await catalog.close();
      await catalog.close();

      expect(factory.created[0].destroyCalls).toBe(1);
    });
  });
});
