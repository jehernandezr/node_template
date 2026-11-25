import type { ConfigEnv } from '@platform/config';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import type { PostgresConnection } from './postgres-connection.js';
import type { ProbeDatabase } from './probe-database.js';
import { ProvisionedService } from './provisioned-service.js';
import { ServicePostgresServer } from './service-postgres-server.js';

/** PostgreSQL y Valkey reales para las pruebas de integración de un servicio, con sus bases y su rol propio. */
export class ServiceTestServers {
  private readonly postgres: ServicePostgresServer;
  readonly valkey: ValkeyTestServer;
  private provisioned: ProvisionedService | undefined;

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

  /** Las bases recién creadas, el rol del servicio y Valkey con el usuario de servicio. */
  environment(): ConfigEnv {
    return {
      ...this.service().environment(),
      ...this.valkey.environment(),
    };
  }

  /** Anota los dos shards en el directorio del catálogo; el catálogo debe estar migrado. */
  async registerShards(): Promise<void> {
    await this.service().registerShards();
  }

  /** Ubica al tenant en uno de los dos shards, como lo haría identity al crearlo. */
  async placeTenant(tenantId: string, shard: 0 | 1): Promise<void> {
    await this.service().placeTenant(tenantId, shard);
  }

  /** Los dos shards, con la conexión de superusuario: para mirar dónde quedó cada fila. */
  shards(): readonly [ProbeDatabase, ProbeDatabase] {
    return this.service().shards();
  }

  catalog(): ProbeDatabase {
    return this.service().catalog();
  }

  /** Cómo entra el servicio a sus bases: con su rol, sujeto al RLS. */
  serviceConnection(): PostgresConnection {
    return this.service().serviceConnection();
  }

  async stop(): Promise<void> {
    await this.valkey.stop();
    await this.postgres.stop();
  }

  private service(): ProvisionedService {
    if (this.provisioned === undefined) {
      throw new Error('ServiceTestServers no está iniciado');
    }
    return this.provisioned;
  }
}
