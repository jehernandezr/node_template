import { SmokeService } from '../../smoke-service.enum.js';
import type { SmokeEnvironment } from '../../smoke-environment.js';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

/**
 * Real smoke test infrastructure: a PostgreSQL with the catalog and two shards, and a Valkey
 * with the service ACL. The app connects to both through environment variables, as in a deployment.
 */
export class SmokeInfrastructure {
  static readonly INSTANCE = 'smoke-instance';
  static readonly CATALOG = 'smoke_catalog';
  static readonly SHARD_A = 'smoke_shard_0';
  static readonly SHARD_B = 'smoke_shard_1';
  static readonly TENANT_A = '0193f1c2-0000-7000-8000-0000000000a1';
  static readonly TENANT_B = '0193f1c2-0000-7000-8000-0000000000b2';

  readonly valkey = new ValkeyTestServer(SmokeService.Name);
  private container: StartedPostgreSqlContainer | undefined;
  private readonly sources = new Map<string, DataSource>();

  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer('postgres:17-alpine')
      .withAutoCleanup(new ContainerRuntime(process.env).autoCleanup())
      .start();
    await this.createDatabases();
    await this.valkey.start();
  }

  async stop(): Promise<void> {
    for (const source of this.sources.values()) {
      await source.destroy();
    }
    this.sources.clear();
    await this.valkey.stop();
    await this.container?.stop();
  }

  /** Variables the app receives: what the deployment would put in the process environment. */
  environment(): SmokeEnvironment {
    const container = this.started;
    return {
      env: {
        SERVICE_NAME: SmokeService.Name,
        OTEL_SDK_DISABLED: 'true',
        AWS_REGION: 'us-east-1',
        AWS_ACCOUNT_ID: '000000000000',
        MESSAGING_NAME_PREFIX: 'smoke',
        DB_USER: container.getUsername(),
        DB_PASSWORD: container.getPassword(),
        DB_CATALOG_NAME: SmokeInfrastructure.CATALOG,
        DB_CATALOG_INSTANCE: SmokeInfrastructure.INSTANCE,
        DB_INSTANCES: JSON.stringify({
          [SmokeInfrastructure.INSTANCE]: {
            primary: { host: container.getHost(), port: container.getPort() },
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

  private get started(): StartedPostgreSqlContainer {
    if (this.container === undefined) {
      throw new Error('the database container is not started');
    }
    return this.container;
  }

  private async createDatabases(): Promise<void> {
    const admin = await this.sourceFor(this.started.getDatabase());
    for (const name of [
      SmokeInfrastructure.CATALOG,
      SmokeInfrastructure.SHARD_A,
      SmokeInfrastructure.SHARD_B,
    ]) {
      await admin.query(`CREATE DATABASE "${name}"`);
    }
  }

  private async sourceFor(database: string): Promise<DataSource> {
    const cached = this.sources.get(database);
    if (cached !== undefined) {
      return cached;
    }
    const container = this.started;
    const source = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database,
    });
    await source.initialize();
    this.sources.set(database, source);
    return source;
  }
}
