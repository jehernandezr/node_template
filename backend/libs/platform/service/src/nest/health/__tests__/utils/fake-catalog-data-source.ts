import type { CatalogDataSource } from '@platform/persistence';
import type { DataSource } from 'typeorm';
import type { FakeDataSource } from './fake-data-source.js';

/** Catálogo de prueba que entrega siempre el mismo `DataSource` de prueba y cuenta las peticiones. */
export class FakeCatalogDataSource {
  requests = 0;

  constructor(private readonly dataSource: FakeDataSource) {}

  get(): Promise<DataSource> {
    this.requests += 1;
    return Promise.resolve(this.dataSource.asDataSource());
  }

  /** Expone el fake con la forma de `CatalogDataSource` que pide `CatalogHealthCheck`. */
  asCatalogDataSource(): CatalogDataSource {
    return this as unknown as CatalogDataSource;
  }
}
