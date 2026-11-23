import { randomBytes } from 'node:crypto';
import type { ConfigEnv } from '@platform/config';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import type { PostgresConnection } from './postgres-connection.js';
import type { ProbeDatabase } from './probe-database.js';
import { ServiceDatabases } from './service-databases.js';
import { ServicePostgresServer } from './service-postgres-server.js';

/**
 * PostgreSQL y Valkey reales para las pruebas de integración de un servicio. El servicio entra con un rol
 * propio sin privilegios de superusuario y dueño de sus bases, como en los ambientes: un superusuario se
 * salta el RLS y las pruebas no lo verían.
 */
export class ServiceTestServers {
  private readonly postgres: ServicePostgresServer;
  readonly valkey: ValkeyTestServer;
  private readonly rolePassword = randomBytes(18).toString('base64url');
  private databases: ServiceDatabases | undefined;

  /**
   * @param shardExtensions Extensiones que el servicio espera en sus shards; las crea el superusuario, como
   *   lo hace la provisión de las bases en los ambientes.
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
    return `${this.serviceName}_service`;
  }

  async start(): Promise<void> {
    await this.postgres.start();
    await this.valkey.start();
    this.databases = await this.postgres.provision();
    await this.createServiceRole(this.databases);
    for (const shard of this.databases.shards) {
      for (const extension of this.shardExtensions) {
        await shard.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
      }
    }
  }

  /** Las bases recién creadas, el rol del servicio y Valkey con el usuario de servicio. */
  environment(): ConfigEnv {
    return {
      ...this.provisioned().environment(this.serviceName),
      DB_USER: this.serviceRole,
      DB_PASSWORD: this.rolePassword,
      ...this.valkey.environment(),
    };
  }

  /** Anota los dos shards en el directorio del catálogo; el catálogo debe estar migrado. */
  async registerShards(): Promise<void> {
    await this.provisioned().registerShards();
  }

  /** Ubica al tenant en uno de los dos shards, como lo haría identity al crearlo. */
  async placeTenant(tenantId: string, shard: 0 | 1): Promise<void> {
    const name = this.shards()[shard].database;
    await this.catalog().query(
      `INSERT INTO shard_directory (tenant_id, region, shard_group, status, version, dedicated, updated_at) VALUES ('${tenantId}', 'eu', ARRAY['${name}'], 'active', 1, false, now())`,
    );
  }

  /** Los dos shards, con la conexión de superusuario: para mirar dónde quedó cada fila. */
  shards(): readonly [ProbeDatabase, ProbeDatabase] {
    return this.provisioned().shards;
  }

  catalog(): ProbeDatabase {
    return this.provisioned().catalog;
  }

  /** Cómo entra el servicio a sus bases: con su rol, sujeto al RLS. */
  serviceConnection(): PostgresConnection {
    const instances = JSON.parse(
      String(this.provisioned().environment(this.serviceName)['DB_INSTANCES']),
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

  async stop(): Promise<void> {
    await this.valkey.stop();
    await this.postgres.stop();
  }

  private async createServiceRole(databases: ServiceDatabases): Promise<void> {
    const role = this.serviceRole;
    await databases.catalog.query(
      `CREATE ROLE "${role}" LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${this.rolePassword}'`,
    );
    for (const database of [databases.catalog, ...databases.shards]) {
      await databases.catalog.query(
        `ALTER DATABASE "${database.database}" OWNER TO "${role}"`,
      );
    }
  }

  private provisioned(): ServiceDatabases {
    if (this.databases === undefined) {
      throw new Error('ServiceTestServers no está iniciado');
    }
    return this.databases;
  }
}
