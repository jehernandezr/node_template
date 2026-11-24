import { randomBytes } from 'node:crypto';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { LedgerSchema } from './ledger-schema.js';

/**
 * Un PostgreSQL con `wal_level=logical` y dos bases, origen y destino, con las tablas de prueba. El servicio entra
 * con un rol propio sin privilegios, sujeto al RLS; la replicación lógica entra como superusuario.
 */
export class TransferTestDatabases {
  static readonly IMAGE = 'postgres:17-alpine';
  private static readonly ROLE = 'ledger_service';

  private container: StartedPostgreSqlContainer | undefined;
  private readonly rolePassword = randomBytes(18).toString('base64url');
  private readonly open: DataSource[] = [];
  private created = 0;

  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer(TransferTestDatabases.IMAGE)
      .withCommand(['postgres', '-c', 'wal_level=logical'])
      .withAutoCleanup(new ContainerRuntime(process.env).autoCleanup())
      .start();
    const admin = await this.connect(this.started().getDatabase(), true);
    await admin.query(
      `CREATE ROLE ${TransferTestDatabases.ROLE} LOGIN PASSWORD '${this.rolePassword}'`,
    );
  }

  /** Un par nuevo de bases, origen y destino, con el esquema creado y su dueño el rol del servicio. */
  async pair(): Promise<{
    readonly source: DataSource;
    readonly target: DataSource;
    readonly sourceAdmin: DataSource;
    readonly targetAdmin: DataSource;
  }> {
    this.created += 1;
    const names = [`source_${this.created}`, `target_${this.created}`];
    const admin = await this.connect(this.started().getDatabase(), true);
    for (const name of names) {
      await admin.query(
        `CREATE DATABASE ${name} OWNER ${TransferTestDatabases.ROLE}`,
      );
    }
    const [source, target] = await Promise.all(
      names.map((name) => this.connect(name, false)),
    );
    if (source === undefined || target === undefined) {
      throw new Error('No se crearon las bases');
    }
    for (const dataSource of [source, target]) {
      for (const statement of LedgerSchema.STATEMENTS) {
        await dataSource.query(statement);
      }
    }
    return {
      source,
      target,
      sourceAdmin: await this.connect(names[0] ?? '', true),
      targetAdmin: await this.connect(names[1] ?? '', true),
    };
  }

  async stop(): Promise<void> {
    try {
      await Promise.all(
        this.open.splice(0).map((dataSource) => dataSource.destroy()),
      );
    } finally {
      await this.container?.stop();
    }
  }

  private async connect(database: string, admin: boolean): Promise<DataSource> {
    const container = this.started();
    const dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: admin ? container.getUsername() : TransferTestDatabases.ROLE,
      password: admin ? container.getPassword() : this.rolePassword,
      database,
      poolSize: 12,
    });
    await dataSource.initialize();
    this.open.push(dataSource);
    return dataSource;
  }

  private started(): StartedPostgreSqlContainer {
    if (this.container === undefined) {
      throw new Error('TransferTestDatabases no está iniciado');
    }
    return this.container;
  }
}
