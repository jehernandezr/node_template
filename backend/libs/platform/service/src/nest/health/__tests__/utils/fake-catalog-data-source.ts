import type { CatalogDataSource } from '@platform/persistence';
import type { DataSource } from 'typeorm';
import type { FakeDataSource } from './fake-data-source.js';

/** Test catalog that always hands out the same test `DataSource` and counts the requests. */
export class FakeCatalogDataSource {
  requests = 0;

  constructor(private readonly dataSource: FakeDataSource) {}

  get(): Promise<DataSource> {
    this.requests += 1;
    return Promise.resolve(this.dataSource.asDataSource());
  }

  /** Exposes the fake with the `CatalogDataSource` shape that `CatalogHealthCheck` requires. */
  asCatalogDataSource(): CatalogDataSource {
    return this as unknown as CatalogDataSource;
  }
}
