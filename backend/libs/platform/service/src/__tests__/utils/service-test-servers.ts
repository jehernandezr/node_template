import type { ConfigEnv } from '@platform/config';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import type { PostgresConnection } from './postgres-connection.js';
import type { ProbeDatabase } from './probe-database.js';
import { ProvisionedService } from './provisioned-service.js';
import { ServicePostgresServer } from './service-postgres-server.js';

/** Real PostgreSQL and Valkey for a service's integration tests, with its databases and its own role. */
export class ServiceTestServers {
  private readonly postgres: ServicePostgresServer;
  readonly valkey: ValkeyTestServer;
  private provisioned: ProvisionedService | undefined;

  /**
   * @param shardExtensions Extensions the service expects in its shards; the superuser creates them, as
   *   database provisioning does in the environments.
   */
  constructor(
    private readonly serviceName: string,
    postgresImage = ServicePostgresServer.IMAGE,
    private readonly shardExtensions: readonly string[] = [],
  ) {
    this.postgres = new ServicePostgresServer(postgresImage);
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
