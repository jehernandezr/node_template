import { randomBytes } from 'node:crypto';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

/**
 * What a region has: its PostgreSQL and its Valkey. The two PostgreSQL servers of the test share
 * user and password, as a service shares them across its instances.
 */
export class RegionServers {
  private static readonly USER = 'ledger';
  private static readonly PASSWORD = randomBytes(18).toString('base64url');

  readonly valkey = new ValkeyTestServer('ledger');
  private postgres: StartedPostgreSqlContainer | undefined;
  private readonly open: DataSource[] = [];

  constructor(
    readonly region: string,
    readonly instance: string,
  ) {}

  get apiBaseUrl(): string {
    return `https://${this.region}.api.test`;
  }

  async start(): Promise<void> {
    this.postgres = await new PostgreSqlContainer('postgres:17-alpine')
      .withUsername(RegionServers.USER)
      .withPassword(RegionServers.PASSWORD)
      .withAutoCleanup(new ContainerRuntime(process.env).autoCleanup())
      .start();
    await this.valkey.start();
  }

  async stop(): Promise<void> {
    try {
      await Promise.all(this.open.splice(0).map((source) => source.destroy()));
    } finally {
      try {
        await this.valkey.stop();
      } finally {
        await this.postgres?.stop();
      }
    }
  }

  async createDatabases(names: readonly string[]): Promise<void> {
    const admin = await this.connect(this.started().getDatabase());
    for (const name of names) {
      await admin.query(`CREATE DATABASE "${name}"`);
    }
  }

  /** Superuser connection to a database, to inspect rows without RLS. */
  async connect(database: string): Promise<DataSource> {
    const source = new DataSource({
      type: 'postgres',
      host: this.started().getHost(),
      port: this.started().getPort(),
      username: RegionServers.USER,
      password: RegionServers.PASSWORD,
      database,
    });
    await source.initialize();
    this.open.push(source);
    return source;
  }

  /** The entry of this instance in `DB_INSTANCES`. */
  endpoint(): { primary: { host: string; port: number } } {
    return {
      primary: {
        host: this.started().getHost(),
        port: this.started().getPort(),
      },
    };
  }

  credentials(): Record<string, string> {
    return { DB_USER: RegionServers.USER, DB_PASSWORD: RegionServers.PASSWORD };
  }

  private started(): StartedPostgreSqlContainer {
    if (this.postgres === undefined) {
      throw new Error('RegionServers no está iniciado');
    }
    return this.postgres;
  }
}
