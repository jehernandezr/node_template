import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { PostgresConnection } from './postgres-connection.js';
import { ProbeDatabase } from './probe-database.js';
import { ServiceDatabases } from './service-databases.js';

/** PostgreSQL real en un contenedor, compartido por una suite; cada prueba crea sus propias bases. */
export class ServicePostgresServer {
  static readonly IMAGE = 'postgres:17-alpine';
  /** La de los servicios que guardan vectores de búsqueda; la misma versión de PostgreSQL. */
  static readonly PGVECTOR_IMAGE = 'pgvector/pgvector:0.8.7-pg17';

  private container: StartedPostgreSqlContainer | undefined;
  private provisioned = 0;

  constructor(private readonly image = ServicePostgresServer.IMAGE) {}

  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer(this.image)
      .withAutoCleanup(new ContainerRuntime(process.env).autoCleanup())
      .start();
  }

  async stop(): Promise<void> {
    await this.container?.stop();
  }

  /** Crea un catálogo y dos shards con nombres que no se repiten dentro de la suite. */
  async provision(): Promise<ServiceDatabases> {
    const container = this.started();
    this.provisioned += 1;
    const suffix = this.provisioned;
    const names = {
      catalog: `catalog_${suffix}`,
      shards: [`svc_${suffix}_shard_0`, `svc_${suffix}_shard_1`] as const,
    };
    const admin = new ProbeDatabase(this.connection(), container.getDatabase());
    await admin.query(`CREATE DATABASE "${names.catalog}"`);
    await admin.query(`CREATE DATABASE "${names.shards[0]}"`);
    await admin.query(`CREATE DATABASE "${names.shards[1]}"`);
    return new ServiceDatabases(this.connection(), names);
  }

  private connection(): PostgresConnection {
    const container = this.started();
    return {
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
    };
  }

  private started(): StartedPostgreSqlContainer {
    if (this.container === undefined) {
      throw new Error('ServicePostgresServer no está iniciado');
    }
    return this.container;
  }
}
