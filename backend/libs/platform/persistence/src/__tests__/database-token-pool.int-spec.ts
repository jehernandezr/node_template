import { ContainerRuntime } from '@platform/kernel/test-utils';
import type { DataSource, QueryRunner } from 'typeorm';
import { databaseConfigSchema } from '../config/database.config.js';
import { EntityRegistry } from '../entity-registry.js';
import { DatabaseKind } from '../model/database-kind.enum.js';
import { PostgresDataSourceFactory } from '../postgres-data-source-factory.js';
import { RecordingDatabaseTokenProvider } from './utils/recording-database-token-provider.js';
import { TestDatabaseServer } from './utils/test-database-server.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('pool with DB_AUTH=iam', () => {
  jest.setTimeout(120_000);
  const server = new TestDatabaseServer();
  const database = 'token_pool_shard_0';
  const connections = 3;
  let tokens: RecordingDatabaseTokenProvider;
  let source: DataSource;
  const runners: QueryRunner[] = [];

  beforeAll(async () => {
    await server.recreate([database]);
    const { host, port, username, password } = server.connection();
    tokens = new RecordingDatabaseTokenProvider(password);
    source = new PostgresDataSourceFactory(
      databaseConfigSchema.parse({
        DB_AUTH: 'iam',
        DB_USER: username,
        DB_CATALOG_NAME: 'token_pool_catalog',
        DB_POOL_MAX: String(connections),
      }),
      { entities: [], migrations: [] },
      { entities: [], migrations: [] },
      new EntityRegistry(),
      tokens,
    ).create(
      { kind: DatabaseKind.Shard, instance: 'main', database },
      { primary: { host, port }, replicas: [] },
    );
    await source.initialize();
  });

  afterAll(async () => {
    await Promise.all(runners.map((runner) => runner.release()));
    await source.destroy();
    await server.drop([database]);
  });

  it('asks the signer once for every connection it opens, for its host, port and user', async () => {
    const { host, port, username } = server.connection();
    for (let index = 0; index < connections; index += 1) {
      const runner = source.createQueryRunner('master');
      await runner.connect();
      runners.push(runner);
    }
    const sessions = await Promise.all(
      runners.map(async (runner) => {
        const rows: { pid: number; open: string }[] = await runner.query(
          `SELECT pg_backend_pid() AS pid,
             (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS open`,
        );
        return rows[0];
      }),
    );
    const pids = sessions.map((session) => session?.pid);
    const open = Math.max(...sessions.map((session) => Number(session?.open)));

    expect(new Set(pids).size).toBe(connections);
    expect(tokens.requests).toHaveLength(open);
    expect(tokens.requests).toEqual(
      tokens.requests.map(() => ({ host, port, user: username })),
    );
  });
});
