import { DataSource } from 'typeorm';
import type { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver.js';
import type { DatabaseSettings } from './config/database.config.js';
import type { EntityRegistry } from './entity-registry.js';
import { DatabaseKind } from './model/database-kind.enum.js';
import type { DatabaseSetDefinition } from './model/database-set-definition.js';
import type { DatabaseTarget } from './model/database-target.js';
import type { DatabaseEndpoint } from './model/database-endpoint.js';
import type { InstanceEndpoints } from './model/instance-endpoints.js';
import { DataSourceFactory } from './ports/data-source-factory.js';
import type { DatabaseTokenProvider } from './ports/database-token-provider.js';

type DriverClientClass = new (config: object) => object;

/**
 * Creates the PostgreSQL `DataSource` of a logical database with read replicas. `synchronize`
 * is always off and migrations never run on their own: `ShardedMigrationRunner` applies them. The password is a
 * function the pool calls on every new connection, so each one gets a fresh token from `DatabaseTokenProvider`. The
 * primary connects as `DB_USER`; the replicas as `DB_READER_USER` when it is set. A connection that does not reach
 * its node within `DB_CONNECT_TIMEOUT_MS` fails, so an unreachable shard never holds its caller. That deadline bounds
 * only opening a connection: a query that waits for a free client of a full pool keeps waiting, bounded by the
 * statements ahead of it.
 */
export class PostgresDataSourceFactory extends DataSourceFactory {
  constructor(
    private readonly settings: DatabaseSettings,
    private readonly shard: DatabaseSetDefinition,
    private readonly catalog: DatabaseSetDefinition,
    private readonly registry: EntityRegistry,
    private readonly tokens: DatabaseTokenProvider,
  ) {
    super();
  }

  /**
   * A module can declare in `forFeature` an entity that the service already listed: TypeORM does not allow duplicates.
   */
  override create(
    target: DatabaseTarget,
    endpoints: InstanceEndpoints,
  ): DataSource {
    const definition =
      target.kind === DatabaseKind.Catalog ? this.catalog : this.shard;
    const credentials = (endpoint: DatabaseEndpoint, user: string) => ({
      host: endpoint.host,
      port: endpoint.port,
      username: user,
      password: () =>
        this.tokens.token({ host: endpoint.host, port: endpoint.port, user }),
      database: target.database,
    });
    const writer = this.settings.DB_USER;
    const reader = this.settings.DB_READER_USER ?? writer;
    const extra: Record<string, unknown> = {
      statement_timeout: this.settings.DB_STATEMENT_TIMEOUT_MS,
    };
    const dataSource = new DataSource({
      type: 'postgres',
      replication: {
        master: credentials(endpoints.primary, writer),
        slaves:
          endpoints.replicas.length > 0
            ? endpoints.replicas.map((replica) => credentials(replica, reader))
            : [credentials(endpoints.primary, writer)],
      },
      ssl: this.settings.DB_SSL,
      poolSize: this.settings.DB_POOL_MAX,
      extra,
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
    extra['Client'] = this.clientWithConnectDeadline(
      (dataSource.driver as PostgresDriver).postgres as {
        readonly Client: DriverClientClass;
      },
      this.settings.DB_CONNECT_TIMEOUT_MS,
    );
    return dataSource;
  }

  private clientWithConnectDeadline(
    driver: { readonly Client: DriverClientClass },
    timeoutMs: number,
  ): DriverClientClass {
    return class extends driver.Client {
      constructor(config: object = {}) {
        super(
          Object.defineProperties(
            {},
            {
              ...Object.getOwnPropertyDescriptors(config),
              connectionTimeoutMillis: { value: timeoutMs, enumerable: true },
            },
          ),
        );
      }
    };
  }
}
