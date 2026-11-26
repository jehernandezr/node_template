import type { ConfigEnv } from '@platform/config';
import { TestDatabaseServer } from '@platform/persistence/test-utils';
import type { MigrationClass } from '@platform/persistence';
import type { PostgresConnection } from './postgres-connection.js';
import type { ProbeDatabase } from './probe-database.js';
import { ServiceDatabases } from './service-databases.js';
import type { ServicePostgresServer } from './service-postgres-server.js';

/**
 * The catalog and the two shards of a service on the shared test server, owned by the service's own role without
 * superuser privileges, as in the environments: a superuser bypasses RLS and the tests would not see it. Several
 * services can share the same server, each with its own databases and role; every role of the run logs in with
 * the run's role password.
 */
export class ProvisionedService {
  /** The test region. */
  static readonly REGION = 'eu';
  /** The shard groups of all services: `group-0` leads to the first shard of each and `group-1` to the second. */
  static readonly GROUPS = ['group-0', 'group-1'] as const;

  private constructor(
    private readonly postgres: ServicePostgresServer,
    private readonly serviceName: string,
    private readonly databases: ServiceDatabases,
    private readonly shardExtensions: readonly string[],
  ) {}

  /**
   * Creates the service role if the run has none yet, and an empty catalog and two shards it owns.
   * @param postgres The shared server.
   * @param serviceName Service the databases belong to.
   * @param shardExtensions Extensions the service expects in its shards; the superuser creates them, as
   *   database provisioning does in the environments.
   * @returns The provisioned databases.
   */
  static async create(
    postgres: ServicePostgresServer,
    serviceName: string,
    shardExtensions: readonly string[] = [],
  ): Promise<ProvisionedService> {
    const role = ProvisionedService.roleOf(serviceName);
    await postgres.ensureServiceRole(role);
    const databases = await postgres.provision(role);
    const provisioned = new ProvisionedService(
      postgres,
      serviceName,
      databases,
      shardExtensions,
    );
    await provisioned.createExtensions();
    return provisioned;
  }

  get serviceRole(): string {
    return ProvisionedService.roleOf(this.serviceName);
  }

  /**
   * Replaces the databases with clones of templates migrated once per run, migrating the templates first when no
   * earlier suite did. The catalog template holds no shard rows: `registerShards` adds this set's own.
   * @param migrations Catalog and shard migrations of the service, which name the templates.
   * @param migrate Migrates the catalog and the shards of the given set, registering its shards on the way.
   */
  async migrateFromTemplates(
    migrations: {
      readonly catalog: readonly MigrationClass[];
      readonly shard: readonly MigrationClass[];
    },
    migrate: (templates: ProvisionedService) => Promise<void>,
  ): Promise<void> {
    const key = TestDatabaseServer.templateKey(
      [migrations.catalog, migrations.shard],
      [this.serviceName, ...this.shardExtensions],
    );
    const templates = new ProvisionedService(
      this.postgres,
      this.serviceName,
      this.postgres.templates(key),
      this.shardExtensions,
    );
    await this.postgres.server.cloneFromTemplates(
      key,
      this.databases.names(),
      templates.databases.names(),
      async () => {
        await templates.createExtensions();
        await migrate(templates);
        await templates.catalog().query('DELETE FROM shard_instances');
      },
      this.serviceRole,
    );
  }

  /** The service databases with their role and their shard groups; without Valkey. */
  environment(): ConfigEnv {
    return {
      ...this.databases.environment(this.serviceName),
      DB_USER: this.serviceRole,
      DB_PASSWORD: this.postgres.rolePassword(),
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
    const { host, port } = this.postgres.connection();
    return {
      host,
      port,
      username: this.serviceRole,
      password: this.postgres.rolePassword(),
    };
  }

  private static roleOf(serviceName: string): string {
    return `${serviceName}_service`;
  }

  private async createExtensions(): Promise<void> {
    await this.postgres.server.createExtensions(
      this.databases.shards.map((shard) => shard.database),
      this.shardExtensions,
    );
  }
}
