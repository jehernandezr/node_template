import { DataSource } from 'typeorm';
import type { DatabaseSettings } from './config/database.config.js';
import type { EntityRegistry } from './entity-registry.js';
import { DatabaseKind } from './model/database-kind.enum.js';
import type { DatabaseSetDefinition } from './model/database-set-definition.js';
import type { DatabaseTarget } from './model/database-target.js';
import type { InstanceEndpoints } from './model/instance-endpoints.js';
import { DataSourceFactory } from './ports/data-source-factory.js';

/**
 * Creates the PostgreSQL `DataSource` of a logical database with read replicas. `synchronize`
 * is always off and migrations never run on their own: `ShardedMigrationRunner` applies them.
 */
export class PostgresDataSourceFactory extends DataSourceFactory {
  constructor(
    private readonly settings: DatabaseSettings,
    private readonly shard: DatabaseSetDefinition,
    private readonly catalog: DatabaseSetDefinition,
    private readonly registry: EntityRegistry,
  ) {
    super();
  }

  create(target: DatabaseTarget, endpoints: InstanceEndpoints): DataSource {
    const definition =
      target.kind === DatabaseKind.Catalog ? this.catalog : this.shard;
    const credentials = (endpoint: { host: string; port: number }) => ({
      host: endpoint.host,
      port: endpoint.port,
      username: this.settings.DB_USER,
      password: this.settings.DB_PASSWORD.reveal(),
      database: target.database,
    });
    return new DataSource({
      type: 'postgres',
      replication: {
        master: credentials(endpoints.primary),
        slaves: (endpoints.replicas.length > 0
          ? endpoints.replicas
          : [endpoints.primary]
        ).map(credentials),
      },
      ssl: this.settings.DB_SSL,
      poolSize: this.settings.DB_POOL_MAX,
      extra: {
        statement_timeout: this.settings.DB_STATEMENT_TIMEOUT_MS,
      },
      // A module can declare in `forFeature` an entity that the service already listed: TypeORM does not allow duplicates.
      entities: [
        ...new Set([
          ...definition.entities,
          ...this.registry.entities(target.kind),
        ]),
      ],
      migrations: [...definition.migrations],
      migrationsRun: false,
      migrationsTransactionMode: 'each',
      synchronize: false,
    });
  }
}
