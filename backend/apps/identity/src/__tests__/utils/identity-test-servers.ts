import { randomBytes } from 'node:crypto';
import type { ConfigEnv } from '@platform/config';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import {
  ServiceDatabases,
  ServicePostgresServer,
  type PostgresConnection,
  type ProbeDatabase,
} from '@platform/service/test-utils';
import { IdentityTestEnvironment } from './identity-test-environment.js';

/**
 * PostgreSQL y Valkey reales para las pruebas de integración de identity. El servicio entra con un rol
 * propio sin privilegios de superusuario y dueño de sus bases, como en los ambientes: un superusuario se
 * salta el RLS y las pruebas no lo verían.
 */
export class IdentityTestServers {
  static readonly SERVICE_ROLE = 'identity_service';

  private readonly postgres = new ServicePostgresServer();
  private readonly valkey = new ValkeyTestServer('identity');
  private readonly rolePassword = randomBytes(18).toString('base64url');
  private databases: ServiceDatabases | undefined;

  async start(): Promise<void> {
    await this.postgres.start();
    await this.valkey.start();
    this.databases = await this.postgres.provision();
    await this.createServiceRole(this.databases);
  }

  /** Entorno de la app: las bases recién creadas, el rol del servicio y Valkey con el usuario de servicio. */
  environment(): ConfigEnv {
    return IdentityTestEnvironment.build({
      ...this.provisioned().environment('identity'),
      DB_USER: IdentityTestServers.SERVICE_ROLE,
      DB_PASSWORD: this.rolePassword,
      ...this.valkey.environment(),
    });
  }

  /** Anota los dos shards en el directorio del catálogo; el catálogo debe estar migrado. */
  async registerShards(): Promise<void> {
    await this.provisioned().registerShards();
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
      String(this.provisioned().environment('identity')['DB_INSTANCES']),
    ) as Record<string, { primary: { host: string; port: number } }>;
    const primary = instances[ServiceDatabases.INSTANCE]?.primary;
    if (primary === undefined) {
      throw new Error('Sin instancia principal en DB_INSTANCES');
    }
    return {
      host: primary.host,
      port: primary.port,
      username: IdentityTestServers.SERVICE_ROLE,
      password: this.rolePassword,
    };
  }

  async stop(): Promise<void> {
    await this.valkey.stop();
    await this.postgres.stop();
  }

  private async createServiceRole(databases: ServiceDatabases): Promise<void> {
    const role = IdentityTestServers.SERVICE_ROLE;
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
      throw new Error('IdentityTestServers no está iniciado');
    }
    return this.databases;
  }
}
