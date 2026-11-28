import { Secret } from '@platform/config';
import { SystemClock } from '@platform/kernel';
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
    ): {
      readonly across: AcrossShards;
      readonly sources: ShardDataSources;
    } => {
      const { host, port, username, password } = server.connection();
      const settings = databaseConfigSchema.parse({
        DB_USER: username,
        DB_PASSWORD: password,
        DB_CATALOG_NAME: 'deadline_probe_catalog',
        DB_POOL_MAX: '2',
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
  },
);
