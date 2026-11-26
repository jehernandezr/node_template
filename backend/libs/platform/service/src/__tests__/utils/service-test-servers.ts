import type { ConfigEnv } from '@platform/config';
import type { MigrationClass } from '@platform/persistence';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import type { PostgresConnection } from './postgres-connection.js';
import type { ProbeDatabase } from './probe-database.js';
import { ProvisionedService } from './provisioned-service.js';
import { ServicePostgresServer } from './service-postgres-server.js';

/** The shared PostgreSQL and Valkey for a service's integration tests, with its databases and its own role. */
export class ServiceTestServers {
  private readonly postgres: ServicePostgresServer;
  readonly valkey: ValkeyTestServer;
  private provisioned: ProvisionedService | undefined;

  /**
   * @param serviceName Service the databases, the role and the Valkey user belong to.
   * @param shardExtensions Extensions the service expects in its shards; the superuser creates them, as
   *   database provisioning does in the environments.
   */
  constructor(
    private readonly serviceName: string,
    private readonly shardExtensions: readonly string[] = [],
  ) {
    this.postgres = new ServicePostgresServer();
    this.valkey = new ValkeyTestServer(serviceName);
  }

  get serviceRole(): string {
    return this.service().serviceRole;
  }

  async start(): Promise<void> {
    await this.postgres.start();
    await this.valkey.start();
    this.provisioned = await ProvisionedService.create(
      this.postgres,
      this.serviceName,
      this.shardExtensions,
    );
  }

  /** The freshly created databases, the service role and Valkey with the service user. */
  environment(): ConfigEnv {
    return {
      ...this.service().environment(),
      ...this.valkey.environment(),
    };
  }

  /** Records the two shards in the catalog directory; the catalog must be migrated. */
  async registerShards(): Promise<void> {
    await this.service().registerShards();
  }

  /**
   * Leaves the databases migrated by cloning templates that the first suite with these migrations migrated.
   * @param migrations Catalog and shard migrations of the service.
   * @param migrate Migrates a set of databases given its environment and a callback that registers its shards.
   */
  async migrateFromTemplates(
    migrations: {
      readonly catalog: readonly MigrationClass[];
      readonly shard: readonly MigrationClass[];
    },
    migrate: (
      environment: ConfigEnv,
      registerShards: () => Promise<void>,
    ) => Promise<void>,
  ): Promise<void> {
    await this.service().migrateFromTemplates(migrations, (templates) =>
      migrate(
        { ...this.valkey.environment(), ...templates.environment() },
        () => templates.registerShards(),
      ),
    );
  }

  /** Places the tenant in one of the two shards, as identity would when creating it. */
  async placeTenant(tenantId: string, shard: 0 | 1): Promise<void> {
    await this.service().placeTenant(tenantId, shard);
  }

  /** The two shards, with the superuser connection: to check where each row ended up. */
  shards(): readonly [ProbeDatabase, ProbeDatabase] {
    return this.service().shards();
  }

  catalog(): ProbeDatabase {
    return this.service().catalog();
  }

  /** How the service connects to its databases: with its role, subject to RLS. */
  serviceConnection(): PostgresConnection {
    return this.service().serviceConnection();
  }

  async stop(): Promise<void> {
    await this.valkey.stop();
    await this.postgres.stop();
  }

  private service(): ProvisionedService {
    if (this.provisioned === undefined) {
      throw new Error('ServiceTestServers is not started');
    }
    return this.provisioned;
  }
}
