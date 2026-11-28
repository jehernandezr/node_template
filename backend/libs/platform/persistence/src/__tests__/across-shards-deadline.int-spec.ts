import { Secret } from '@platform/config';
import { SystemClock } from '@platform/kernel';
import type { DataSource } from 'typeorm';
import type { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver.js';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { AcrossShards } from '../across-shards.js';
import { databaseConfigSchema } from '../config/database.config.js';
import { EntityRegistry } from '../entity-registry.js';
import type { DatabaseEndpoint } from '../model/database-endpoint.js';
import { PasswordDatabaseTokenProvider } from '../password-database-token-provider.js';
import { PostgresDataSourceFactory } from '../postgres-data-source-factory.js';
import { ShardDataSources } from '../shard-data-sources.js';
import { FakeTransactionManager } from './utils/fake-transaction-manager.js';
import { FixedInstanceEndpointResolver } from './utils/fixed-instance-endpoint-resolver.js';
import { SilentTcpServer } from './utils/silent-tcp-server.js';
import { StaticShardLister } from './utils/static-shard-lister.js';
import { TestDatabaseServer } from './utils/test-database-server.js';

const runtime = new ContainerRuntime(process.env);
const POOL_LOCK_KEY = 4_120_011;

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitUntilQueued = async (dataSource: DataSource): Promise<void> => {
  const pool = (dataSource.driver as PostgresDriver).master as {
    readonly waitingCount: number;
  };
  while (pool.waitingCount === 0) {
    await pause(10);
  }
};

runtime.describeIfAvailable(
  'AcrossShards with a shard that never answers',
  () => {
    jest.setTimeout(120_000);
    const server = new TestDatabaseServer();
    const silent = new SilentTcpServer();
    const reachable = 'deadline_probe_shard_0';
    const unreachable = 'deadline_probe_shard_1';
    const opened: ShardDataSources[] = [];
    let silentEndpoint: DatabaseEndpoint;

    const across = (
      connectTimeoutMs: number,
      poolMax = 2,
    ): {
      readonly across: AcrossShards;
      readonly sources: ShardDataSources;
    } => {
      const { host, port, username, password } = server.connection();
      const settings = databaseConfigSchema.parse({
        DB_USER: username,
        DB_PASSWORD: password,
        DB_CATALOG_NAME: 'deadline_probe_catalog',
        DB_POOL_MAX: String(poolMax),
        DB_CONNECT_TIMEOUT_MS: String(connectTimeoutMs),
      });
      const sources = new ShardDataSources(
        new PostgresDataSourceFactory(
          settings,
          { entities: [], migrations: [] },
          { entities: [], migrations: [] },
          new EntityRegistry(),
          new PasswordDatabaseTokenProvider(new Secret(password)),
        ),
        new FixedInstanceEndpointResolver({
          reachable: { primary: { host, port }, replicas: [] },
          unreachable: { primary: silentEndpoint, replicas: [] },
        }),
        new SystemClock(),
        { idleTtlMs: 300_000 },
      );
      opened.push(sources);
      return {
        sources,
        across: new AcrossShards(
          new StaticShardLister([
            { logicalShard: reachable, instance: 'reachable' },
            { logicalShard: unreachable, instance: 'unreachable' },
          ]),
          sources,
          new FakeTransactionManager(false),
          new SystemClock(),
        ),
      };
    };

    const databaseOf = async (
      dataSource: Parameters<
        Parameters<AcrossShards['run']>[0]
      >[0]['dataSource'],
    ): Promise<string> => {
      const rows: { name: string }[] = await dataSource.query(
        'SELECT current_database() AS name',
      );
      return rows[0]?.name ?? '';
    };

    beforeAll(async () => {
      await server.recreate([reachable]);
      silentEndpoint = await silent.start();
    });

    afterAll(async () => {
      await silent.stop();
      await Promise.all(opened.map((sources) => sources.close()));
      await server.drop([reachable]);
    });

    it('answers with the reachable shard and reports the other as timed out at its deadline', async () => {
      const { across: walk } = across(60_000);

      const result = await walk.run(
        ({ dataSource }) => databaseOf(dataSource),
        { shardTimeoutMs: 1_000 },
      );

      expect(result.results).toEqual([{ shard: reachable, value: reachable }]);
      expect(result.failures).toEqual([
        expect.objectContaining({ shard: unreachable, timedOut: true }),
      ]);
      expect(result.partial).toBe(true);
    });

    it('gives up on the shard after DB_CONNECT_TIMEOUT_MS and opens it again on the next run', async () => {
      const { across: walk, sources } = across(500);

      const result = await walk.run(
        ({ dataSource }) => databaseOf(dataSource),
        { shardTimeoutMs: 60_000 },
      );

      expect(result.results).toEqual([{ shard: reachable, value: reachable }]);
      expect(result.failures).toEqual([
        { shard: unreachable, timedOut: false, code: undefined },
      ]);
      expect(sources.activeShards()).toEqual([reachable]);
    });

    it('lets a query wait for a free client of a full pool longer than DB_CONNECT_TIMEOUT_MS', async () => {
      const connectTimeoutMs = 300;
      const shard = { logicalShard: reachable, instance: 'reachable' };
      const { sources } = across(connectTimeoutMs, 1);
      const dataSource = await sources.get(shard);
      const lockHolder = (
        await across(60_000).sources.get(shard)
      ).createQueryRunner();
      await lockHolder.query('SELECT pg_advisory_lock($1)', [POOL_LOCK_KEY]);

      const held = dataSource.query(
        "SELECT 'held' AS state FROM pg_advisory_xact_lock($1)",
        [POOL_LOCK_KEY],
      );
      const waiting = dataSource.query('SELECT 1 AS answered');
      await waitUntilQueued(dataSource);
      await pause(connectTimeoutMs * 3);
      await lockHolder.query('SELECT pg_advisory_unlock($1)', [POOL_LOCK_KEY]);
      await lockHolder.release();

      await expect(held).resolves.toEqual([{ state: 'held' }]);
      await expect(waiting).resolves.toEqual([{ answered: 1 }]);
    });
  },
);
