import { SmokeService } from '../../smoke-service.enum.js';
import type { SmokeEnvironment } from '../../smoke-environment.js';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import type { SharedPostgres } from '@platform/kernel/test-utils';
import { TestDatabaseServer } from '@platform/persistence/test-utils';
import { DataSource } from 'typeorm';

/**
 * Real smoke test infrastructure: the catalog and two shards on the PostgreSQL the Jest run shares, and a Valkey
 * user with the service ACL. The app connects to both through environment variables, as in a deployment.
 */
export class SmokeInfrastructure {
  static readonly INSTANCE = 'smoke-instance';
  static readonly CATALOG = 'smoke_catalog';
  static readonly SHARD_A = 'smoke_shard_0';
  static readonly SHARD_B = 'smoke_shard_1';
  static readonly TENANT_A = '0193f1c2-0000-7000-8000-0000000000a1';
  static readonly TENANT_B = '0193f1c2-0000-7000-8000-0000000000b2';
  private static readonly DATABASES = [
    SmokeInfrastructure.CATALOG,
    SmokeInfrastructure.SHARD_A,
    SmokeInfrastructure.SHARD_B,
  ];

  readonly valkey = new ValkeyTestServer(SmokeService.Name);
  private readonly databases = new TestDatabaseServer();
  private server: SharedPostgres | undefined;
  private readonly sources = new Map<string, DataSource>();

  /** Creates the three databases, replacing any a previous suite left, and the Valkey user. */
  async start(): Promise<void> {
    this.server = this.databases.connection();
    await this.databases.recreate(SmokeInfrastructure.DATABASES);
    await this.valkey.start();
  }

  /** Closes the connections, drops the databases and removes the Valkey user's keys. */
  async stop(): Promise<void> {
    for (const source of this.sources.values()) {
      await source.destroy();
    }
    this.sources.clear();
    await this.valkey.stop();
    if (this.server !== undefined) {
      await this.databases.drop(SmokeInfrastructure.DATABASES);
    }
  }

  /** Variables the app receives: what the deployment would put in the process environment. */
  environment(): SmokeEnvironment {
    const server = this.started;
    return {
      env: {
        SERVICE_NAME: SmokeService.Name,
        OTEL_SDK_DISABLED: 'true',
        AWS_REGION: 'us-east-1',
        AWS_ACCOUNT_ID: '000000000000',
        MESSAGING_NAME_PREFIX: 'smoke',
        DB_USER: server.username,
        DB_PASSWORD: server.password,
        DB_CATALOG_NAME: SmokeInfrastructure.CATALOG,
        DB_CATALOG_INSTANCE: SmokeInfrastructure.INSTANCE,
        DB_INSTANCES: JSON.stringify({
          [SmokeInfrastructure.INSTANCE]: {
            primary: { host: server.host, port: server.port },
            replicas: [],
          },
        }),
        VALKEY_URL: `redis://${SmokeService.Name}:${this.valkey.password}@${this.valkey.host}:${this.valkey.port}`,
        VALKEY_KEY_PREFIX: SmokeService.Name,
      },
    };
  }

  /** Reads rows from a database directly, outside the app. */
  async rows(
    database: string,
    sql: string,
  ): Promise<Record<string, unknown>[]> {
    const source = await this.sourceFor(database);
    return source.query(sql);
  }

  private get started(): SharedPostgres {
    if (this.server === undefined) {
      throw new Error('the smoke databases are not created');
    }
    return this.server;
  }

  private async sourceFor(database: string): Promise<DataSource> {
    const cached = this.sources.get(database);
    if (cached !== undefined) {
      return cached;
    }
    const server = this.started;
    const source = new DataSource({
      type: 'postgres',
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      database,
    });
    await source.initialize();
    this.sources.set(database, source);
    return source;
  }
}
