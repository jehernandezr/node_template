import { PersistenceErrorCode } from '../errors/persistence-error-code.enum.js';
import {
  SystemClock,
  TransactionManager,
  type UnitOfWork,
} from '@platform/kernel';
import { ShardingErrorCode } from '@platform/sharding';
import { AcrossShards } from '../across-shards.js';
import { PersistenceError } from '../errors/persistence-error.js';
import type { ShardLocation } from '../model/shard-location.js';
import { ShardDataSources } from '../shard-data-sources.js';
import { FakeDataSourceFactory } from './utils/fake-data-source-factory.js';
import { FakeInstanceEndpointResolver } from './utils/fake-instance-endpoint-resolver.js';
import { StaticShardLister } from './utils/static-shard-lister.js';

const SHARDS: readonly ShardLocation[] = [
  { logicalShard: 'svc_shard_1', instance: 'instance-1' },
  { logicalShard: 'svc_shard_2', instance: 'instance-1' },
  { logicalShard: 'svc_shard_3', instance: 'instance-1' },
];

/** Transaction manager that only reports whether one is open. */
class FakeTransactionManager extends TransactionManager {
  constructor(private readonly open: boolean) {
    super();
  }

  override runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return fn({
      database: '',
      afterCommit: () => undefined,
      afterRollback: () => undefined,
    });
  }

  override current(): undefined {
    return undefined;
  }

  override isInTransaction(): boolean {
    return this.open;
  }

  override afterCommit(): void {}
}

/** One turn through the scheduler: lets the other workers run before continuing. */
function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function buildAcross(
  shards: readonly ShardLocation[] = SHARDS,
  transactions: TransactionManager = new FakeTransactionManager(false),
): AcrossShards {
  const sources = new ShardDataSources(
    new FakeDataSourceFactory(),
    new FakeInstanceEndpointResolver(),
    new SystemClock(),
    { idleTtlMs: 60_000 },
  );
  return new AcrossShards(
    new StaticShardLister(shards),
    sources,
    transactions,
    new SystemClock(),
  );
}

describe('AcrossShards', () => {
  describe('when every shard answers', () => {
    it('visits all shards in the order the lister gives them', async () => {
      const result = await buildAcross().run(({ location }) =>
        Promise.resolve(location.logicalShard),
      );

      expect(result.results).toEqual([
        { shard: 'svc_shard_1', value: 'svc_shard_1' },
        { shard: 'svc_shard_2', value: 'svc_shard_2' },
        { shard: 'svc_shard_3', value: 'svc_shard_3' },
      ]);
      expect(result.failures).toEqual([]);
      expect(result.partial).toBe(false);
    });
  });

  describe('with a concurrency of two', () => {
    it('never has more than two shards in flight', async () => {
      let running = 0;
      let peak = 0;

      await buildAcross().run(
        async () => {
          running += 1;
          peak = Math.max(peak, running);
          await flush();
          running -= 1;
          return running;
        },
        { concurrency: 2 },
      );

      expect(peak).toBe(2);
    });
  });

  describe('when one shard throws a platform error', () => {
    it('reports it with its code and keeps the others', async () => {
      const result = await buildAcross().run(({ location }) => {
        if (location.logicalShard === 'svc_shard_2') {
          return Promise.reject(
            new PersistenceError(PersistenceErrorCode.QueryFailed, 'failed'),
          );
        }
        return Promise.resolve(location.logicalShard);
      });

      expect(result.failures).toEqual([
        {
          shard: 'svc_shard_2',
          timedOut: false,
          code: PersistenceErrorCode.QueryFailed,
        },
      ]);
      expect(result.results.map((entry) => entry.shard)).toEqual([
        'svc_shard_1',
        'svc_shard_3',
      ]);
      expect(result.partial).toBe(true);
    });
  });

  describe('when one shard throws an error that is not a platform error', () => {
    it('reports it without a code', async () => {
      const result = await buildAcross().run(({ location }) =>
        location.logicalShard === 'svc_shard_1'
          ? Promise.reject(new Error('plain failure'))
          : Promise.resolve(location.logicalShard),
      );

      expect(result.failures).toEqual([
        { shard: 'svc_shard_1', timedOut: false, code: undefined },
      ]);
    });
  });

  describe('when one shard never answers in time', () => {
    it('reports it as timed out', async () => {
      const result = await buildAcross().run(
        ({ location }) =>
          location.logicalShard === 'svc_shard_1'
            ? new Promise<string>(() => undefined)
            : Promise.resolve(location.logicalShard),
        { shardTimeoutMs: 20 },
      );

      expect(result.failures).toEqual([
        expect.objectContaining({ shard: 'svc_shard_1', timedOut: true }),
      ]);
      expect(result.partial).toBe(true);
    });
  });

  describe('when called inside a transaction', () => {
    it('rejects with CROSS_SHARD_TX', async () => {
      await expect(
        buildAcross(SHARDS, new FakeTransactionManager(true)).run(() =>
          Promise.resolve(1),
        ),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.CrossShardTransaction,
      });
    });
  });

  describe('when the options are invalid', () => {
    it.each([[{ concurrency: 0 }], [{ shardTimeoutMs: 1.5 }]])(
      'rejects %o with INVALID_CONFIG',
      async (options) => {
        await expect(
          buildAcross().run(() => Promise.resolve(1), options),
        ).rejects.toMatchObject({
          code: PersistenceErrorCode.InvalidConfig,
        });
      },
    );
  });
});
