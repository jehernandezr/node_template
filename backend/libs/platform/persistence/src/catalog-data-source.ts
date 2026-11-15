import type { DataSource } from 'typeorm';
import type { DatabaseSettings } from './config/database.config.js';
import { DatabaseKind } from './model/database-kind.enum.js';
import type { DataSourceFactory } from './ports/data-source-factory.js';
import type { InstanceEndpointResolver } from './ports/instance-endpoint-resolver.js';

/** El `DataSource` del catálogo global (directorio y tablas de referencia). Se crea al primer uso. */
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

  /** `DataSource` inicializado del catálogo. */
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
    // Un fallo deja el campo libre para que la siguiente llamada reintente.
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
