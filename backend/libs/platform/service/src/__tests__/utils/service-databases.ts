import type { ConfigEnv } from '@platform/config';
import type { PostgresConnection } from './postgres-connection.js';
import { ProbeDatabase } from './probe-database.js';

/**
 * Un catálogo y dos shards recién creados en el servidor de pruebas. Cada prueba pide los suyos, así
 * que ninguna depende del estado que deja otra.
 */
export class ServiceDatabases {
  static readonly INSTANCE = 'main';

  readonly catalog: ProbeDatabase;
  readonly shards: readonly [ProbeDatabase, ProbeDatabase];

  constructor(
    private readonly connection: PostgresConnection,
    names: {
      readonly catalog: string;
      readonly shards: readonly [string, string];
    },
  ) {
    this.catalog = new ProbeDatabase(connection, names.catalog);
    this.shards = [
      new ProbeDatabase(connection, names.shards[0]),
      new ProbeDatabase(connection, names.shards[1]),
    ];
  }

  /** Variables de entorno que apuntan el servicio a estas bases. */
  environment(serviceName: string): ConfigEnv {
    return {
      SERVICE_NAME: serviceName,
      DB_USER: this.connection.username,
      DB_PASSWORD: this.connection.password,
      DB_CATALOG_NAME: this.catalog.database,
      DB_CATALOG_INSTANCE: ServiceDatabases.INSTANCE,
      DB_INSTANCES: JSON.stringify({
        [ServiceDatabases.INSTANCE]: {
          primary: { host: this.connection.host, port: this.connection.port },
        },
      }),
      OTEL_SDK_DISABLED: 'true',
    };
  }

  /** Anota los dos shards en el directorio del catálogo, que ya debe estar migrado. */
  async registerShards(): Promise<void> {
    const [first, second] = this.shards;
    await this.catalog.query(
      `INSERT INTO shard_instances (logical_shard, instance, updated_at) VALUES ('${first.database}', '${ServiceDatabases.INSTANCE}', now()), ('${second.database}', '${ServiceDatabases.INSTANCE}', now())`,
    );
  }
}
