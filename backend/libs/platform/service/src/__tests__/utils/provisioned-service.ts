import { randomBytes } from 'node:crypto';
import type { ConfigEnv } from '@platform/config';
import type { PostgresConnection } from './postgres-connection.js';
import type { ProbeDatabase } from './probe-database.js';
import { ServiceDatabases } from './service-databases.js';
import type { ServicePostgresServer } from './service-postgres-server.js';

/**
 * El catálogo y los dos shards de un servicio en un servidor de pruebas, con un rol propio sin privilegios de
 * superusuario y dueño de sus bases, como en los ambientes: un superusuario se salta el RLS y las pruebas no lo
 * verían. Varios servicios pueden compartir el mismo servidor, cada uno con sus bases y su rol.
 */
export class ProvisionedService {
  /** La región de las pruebas. */
  static readonly REGION = 'eu';
  /** Los grupos de shards de todos los servicios: `group-0` lleva al primer shard de cada uno y `group-1` al segundo. */
  static readonly GROUPS = ['group-0', 'group-1'] as const;

  private constructor(
    private readonly serviceName: string,
    private readonly databases: ServiceDatabases,
    private readonly rolePassword: string,
  ) {}

  /**
   * @param shardExtensions Extensiones que el servicio espera en sus shards; las crea el superusuario, como lo
   *   hace la provisión de las bases en los ambientes.
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

  /** Las bases del servicio con su rol y sus grupos de shards; sin Valkey. */
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

  /** Anota los dos shards en el directorio del catálogo; el catálogo debe estar migrado. */
  async registerShards(): Promise<void> {
    await this.databases.registerShards();
  }

  /** Ubica al tenant en uno de los dos shards, como lo haría identity al crearlo. */
  async placeTenant(tenantId: string, shard: 0 | 1): Promise<void> {
    const name = this.shards()[shard].database;
    await this.catalog().query(
      `INSERT INTO shard_directory (tenant_id, region, shard_group, status, version, dedicated, updated_at) VALUES ('${tenantId}', '${ProvisionedService.REGION}', ARRAY['${name}'], 'active', 1, false, now())`,
    );
  }

  /** Los dos shards, con la conexión de superusuario: para mirar dónde quedó cada fila. */
  shards(): readonly [ProbeDatabase, ProbeDatabase] {
    return this.databases.shards;
  }

  catalog(): ProbeDatabase {
    return this.databases.catalog;
  }

  /** Cómo entra el servicio a sus bases: con su rol, sujeto al RLS. */
  serviceConnection(): PostgresConnection {
    const instances = JSON.parse(
      String(this.databases.environment(this.serviceName)['DB_INSTANCES']),
    ) as Record<string, { primary: { host: string; port: number } }>;
    const primary = instances[ServiceDatabases.INSTANCE]?.primary;
    if (primary === undefined) {
      throw new Error('Sin instancia principal en DB_INSTANCES');
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
