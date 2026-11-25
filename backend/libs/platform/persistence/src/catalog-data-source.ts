import type { DataSource } from 'typeorm';
import type { DatabaseSettings } from './config/database.config.js';
import { DatabaseKind } from './model/database-kind.enum.js';
import type { DataSourceFactory } from './ports/data-source-factory.js';
import type { InstanceEndpointResolver } from './ports/instance-endpoint-resolver.js';

/** The `DataSource` of the global catalog (directory and reference tables). Created on first use. */
export class CatalogDataSource {
  private pending: Promise<DataSource> | undefined;
  private created: DataSource | undefined;

  constructor(
    private readonly factory: DataSourceFactory,
    private readonly endpoints: InstanceEndpointResolver,
    private readonly settings: Pick<
      DatabaseSettings,
      'DB_CATALOG_NAME' | 'DB_CATALOG_INSTANCE'
    >,
  ) {}

  /** Returns the initialized catalog `DataSource`. */
  get(): Promise<DataSource> {
    if (this.pending !== undefined) {
      return this.pending;
    }
    const dataSource = this.factory.create(
      {
        kind: DatabaseKind.Catalog,
        instance: this.settings.DB_CATALOG_INSTANCE,
        database: this.settings.DB_CATALOG_NAME,
      },
      this.endpoints.resolve(this.settings.DB_CATALOG_INSTANCE),
    );
    this.created = dataSource;
    // A failure leaves the field empty so the next call retries.
    this.pending = dataSource.initialize().catch((error: unknown) => {
      this.pending = undefined;
      this.created = undefined;
      throw error;
    });
    return this.pending;
  }

  async close(): Promise<void> {
    try {
      if (this.created !== undefined && this.created.isInitialized) {
        await this.created.destroy();
      }
    } finally {
      this.pending = undefined;
      this.created = undefined;
    }
  }
}
