import { randomBytes } from 'node:crypto';
import { TestDatabaseServer } from '@platform/persistence/test-utils';
import { DataSource } from 'typeorm';
import { LedgerSchema } from './ledger-schema.js';

/**
 * Pairs of databases, source and target, with the test tables, on the PostgreSQL the Jest run shares, which runs
 * with `wal_level=logical`. The service connects with its own unprivileged role, subject to RLS; logical
 * replication connects as superuser.
 */
export class TransferTestDatabases {
  private static readonly ROLE = 'ledger_service';

  private readonly databases = new TestDatabaseServer();
  private readonly open: DataSource[] = [];
  private readonly created: string[] = [];

  /** Creates the service role unless an earlier suite of the run did. */
  async start(): Promise<void> {
    await this.databases.ensureRole(TransferTestDatabases.ROLE);
  }

  /** A new pair of databases, source and target, with the schema created and owned by the service role. */
  async pair(): Promise<{
    readonly source: DataSource;
    readonly target: DataSource;
    readonly sourceAdmin: DataSource;
    readonly targetAdmin: DataSource;
  }> {
    const suffix = randomBytes(4).toString('hex');
    const names = [`source_${suffix}`, `target_${suffix}`];
    await this.databases.recreate(names, TransferTestDatabases.ROLE);
    this.created.push(...names);
    const [source, target] = await Promise.all(
      names.map((name) => this.connect(name, false)),
    );
    if (source === undefined || target === undefined) {
      throw new Error('The databases were not created');
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

  /** Closes every connection, removes the subscriptions and slots the pairs left and drops the pairs. */
  async stop(): Promise<void> {
    try {
      await Promise.all(
        this.open.splice(0).map((dataSource) => dataSource.destroy()),
      );
    } finally {
      const created = this.created.splice(0);
      for (const name of created) {
        await this.releaseReplication(name);
      }
      await this.databases.drop(created);
    }
  }

  private async releaseReplication(database: string): Promise<void> {
    const admin = await this.connect(database, true);
    try {
      const subscriptions: { subname: string }[] = await admin.query(
        'SELECT subname FROM pg_subscription WHERE subdbid = (SELECT oid FROM pg_database WHERE datname = current_database())',
      );
      for (const { subname } of subscriptions) {
        await admin.query(`ALTER SUBSCRIPTION "${subname}" DISABLE`);
        await admin.query(
          `ALTER SUBSCRIPTION "${subname}" SET (slot_name = NONE)`,
        );
        await admin.query(`DROP SUBSCRIPTION "${subname}"`);
      }
      await admin.query(
        'SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots WHERE database = current_database() AND NOT active',
      );
    } finally {
      this.open.splice(this.open.indexOf(admin), 1);
      await admin.destroy();
    }
  }

  private async connect(database: string, admin: boolean): Promise<DataSource> {
    const server = this.databases.connection();
    const dataSource = new DataSource({
      type: 'postgres',
      host: server.host,
      port: server.port,
      username: admin ? server.username : TransferTestDatabases.ROLE,
      password: admin ? server.password : this.databases.rolePassword(),
      database,
      poolSize: 12,
    });
    await dataSource.initialize();
    this.open.push(dataSource);
    return dataSource;
  }
}
