import { randomBytes } from 'node:crypto';
import type { ConfigEnv } from '@platform/config';
import type { PostgresConnection } from './postgres-connection.js';
import type { ProbeDatabase } from './probe-database.js';
import { ServiceDatabases } from './service-databases.js';
import type { ServicePostgresServer } from './service-postgres-server.js';

/**
 * The catalog and the two shards of a service on a test server, with its own role without superuser
 * privileges that owns its databases, as in the environments: a superuser bypasses RLS and the tests would not
 * see it. Several services can share the same server, each with its own databases and role.
 */
export class ProvisionedService {
  /** The test region. */
  static readonly REGION = 'eu';
  /** The shard groups of all services: `group-0` leads to the first shard of each and `group-1` to the second. */
  static readonly GROUPS = ['group-0', 'group-1'] as const;

  private constructor(
    private readonly serviceName: string,
    private readonly databases: ServiceDatabases,
    private readonly rolePassword: string,
  ) {}

  /**
   * @param shardExtensions Extensions the service expects in its shards; the superuser creates them, as
   *   database provisioning does in the environments.
   */
  static async create(
    postgres: ServicePostgresServer,
    serviceName: string,
    shardExtensions: readonly string[] = [],
  ): Promise<ProvisionedService> {
    const databases = await postgres.provision();
    const provisioned = new ProvisionedService(
      serviceName,
      databases,
      randomBytes(18).toString('base64url'),
    );
    await provisioned.createServiceRole();
    for (const shard of databases.shards) {
      for (const extension of shardExtensions) {
        await shard.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
      }
    }
    return provisioned;
  }

  get serviceRole(): string {
    return `${this.serviceName}_service`;
  }

  /** The service databases with their role and their shard groups; without Valkey. */
  environment(): ConfigEnv {
    return {
      ...this.databases.environment(this.serviceName),
      DB_USER: this.serviceRole,
      DB_PASSWORD: this.rolePassword,
      TENANT_MOVE_TARGETS: JSON.stringify(
        Object.fromEntries(
          ProvisionedService.GROUPS.map((group, index) => [
            group,
            {
              region: ProvisionedService.REGION,
              shard: this.databases.shards[index]?.database,
            },
          ]),
        ),
      ),
    };
  }

  /** Records the two shards in the catalog directory; the catalog must be migrated. */
  async registerShards(): Promise<void> {
    await this.databases.registerShards();
  }

  /** Places the tenant in one of the two shards, as identity would when creating it. */
  async placeTenant(tenantId: string, shard: 0 | 1): Promise<void> {
    const name = this.shards()[shard].database;
    await this.catalog().query(
      `INSERT INTO shard_directory (tenant_id, region, shard_group, status, version, dedicated, updated_at) VALUES ('${tenantId}', '${ProvisionedService.REGION}', ARRAY['${name}'], 'active', 1, false, now())`,
    );
  }

  /** The two shards, with the superuser connection: to check where each row ended up. */
  shards(): readonly [ProbeDatabase, ProbeDatabase] {
    return this.databases.shards;
  }

  catalog(): ProbeDatabase {
    return this.databases.catalog;
  }

  /** How the service connects to its databases: with its role, subject to RLS. */
  serviceConnection(): PostgresConnection {
    const instances = JSON.parse(
      String(this.databases.environment(this.serviceName)['DB_INSTANCES']),
    ) as Record<string, { primary: { host: string; port: number } }>;
    const primary = instances[ServiceDatabases.INSTANCE]?.primary;
    if (primary === undefined) {
      throw new Error('No primary instance in DB_INSTANCES');
    }
    return {
      host: primary.host,
      port: primary.port,
      username: this.serviceRole,
      password: this.rolePassword,
    };
  }

  private async createServiceRole(): Promise<void> {
    const role = this.serviceRole;
    const { catalog, shards } = this.databases;
    await catalog.query(
      `CREATE ROLE "${role}" LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${this.rolePassword}'`,
    );
    for (const database of [catalog, ...shards]) {
      await catalog.query(
        `ALTER DATABASE "${database.database}" OWNER TO "${role}"`,
      );
    }
  }
}
