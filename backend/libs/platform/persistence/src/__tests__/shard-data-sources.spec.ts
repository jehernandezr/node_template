import { FixedClock } from '@platform/kernel/test-utils';
import { PersistenceErrorCode } from '../errors/persistence-error-code.enum.js';
import { ShardDataSources } from '../shard-data-sources.js';
import { FakeDataSourceFactory } from './utils/fake-data-source-factory.js';
import { FakeInstanceEndpointResolver } from './utils/fake-instance-endpoint-resolver.js';

const SHARD_A = { logicalShard: 'svc_shard_a', instance: 'instance-1' };
const SHARD_B = { logicalShard: 'svc_shard_b', instance: 'instance-1' };
const IDLE_TTL_MS = 1_000;

function buildSources(
  clock: FixedClock,
  factory: FakeDataSourceFactory,
): ShardDataSources {
  return new ShardDataSources(
    factory,
    new FakeInstanceEndpointResolver(),
    clock,
    {
      idleTtlMs: IDLE_TTL_MS,
    },
  );
}

describe('ShardDataSources', () => {
  describe('when a shard is requested twice', () => {
    it('reuses the same DataSource', async () => {
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(new FixedClock(), factory);

      const first = await sources.get(SHARD_A);
      const second = await sources.get(SHARD_A);

      expect(second).toBe(first);
      expect(factory.created).toHaveLength(1);
    });
  });

  describe('when two calls for the same shard run concurrently', () => {
    it('initializes the DataSource once', async () => {
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(new FixedClock(), factory);

      await Promise.all([sources.get(SHARD_A), sources.get(SHARD_A)]);

      expect(factory.created[0].initializeCalls).toBe(1);
    });
  });

  describe('when two calls see the shard move to another instance at the same time', () => {
    it('opens one DataSource on the new instance and leaves none of the others open', async () => {
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(new FixedClock(), factory);
      await sources.get(SHARD_A);
      const moved = { ...SHARD_A, instance: 'instance-2' };

      const [first, second] = await Promise.all([
        sources.get(moved),
        sources.get(moved),
      ]);

      expect(second).toBe(first);
      expect(
        factory.created.filter((source) => source.destroyCalls === 0),
      ).toHaveLength(1);
    });

    it('leaves only the DataSource of the last instance requested open when requests for both instances race', async () => {
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(new FixedClock(), factory);
      await sources.get(SHARD_A);
      const moved = { ...SHARD_A, instance: 'instance-2' };

      await Promise.all([sources.get(moved), sources.get(SHARD_A)]);
      const current = await sources.get(moved);

      expect(
        factory.created.filter((source) => source.destroyCalls === 0),
      ).toEqual([current]);
    });
  });

  describe('when the shard moves to another instance', () => {
    it('destroys the old DataSource and creates a new one', async () => {
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(new FixedClock(), factory);
      await sources.get(SHARD_A);

      await sources.get({ ...SHARD_A, instance: 'instance-2' });

      expect(factory.created[0].destroyCalls).toBe(1);
      expect(factory.created).toHaveLength(2);
      expect(sources.activeShards()).toEqual([SHARD_A.logicalShard]);
    });
  });

  describe('when a shard stays idle past the TTL', () => {
    it('closes it when another shard is requested, and keeps the new one', async () => {
      const clock = new FixedClock();
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(clock, factory);
      await sources.get(SHARD_A);

      clock.advance(IDLE_TTL_MS + 1);
      await sources.get(SHARD_B);

      expect(sources.activeShards()).toEqual([SHARD_B.logicalShard]);
    });
  });

  describe('when the first initialization fails', () => {
    it('rejects that call and initializes again on the next one', async () => {
      const factory = new FakeDataSourceFactory();
      factory.failNext(1);
      const sources = buildSources(new FixedClock(), factory);

      await expect(sources.get(SHARD_A)).rejects.toThrow('initialize failed');
      const retried = await sources.get(SHARD_A);

      expect(retried.isInitialized).toBe(true);
      expect(factory.created).toHaveLength(2);
    });
  });

  describe('when closed', () => {
    it('destroys every DataSource and a second close does nothing', async () => {
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(new FixedClock(), factory);
      await sources.get(SHARD_A);
      await sources.get(SHARD_B);

      await sources.close();
      await sources.close();

      expect(factory.created.map((ds) => ds.destroyCalls)).toEqual([1, 1]);
      expect(sources.activeShards()).toEqual([]);
    });

    it('refuses to open a shard again, so nothing is left open after shutdown', async () => {
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(new FixedClock(), factory);
      await sources.get(SHARD_A);

      await sources.close();

      await expect(sources.get(SHARD_B)).rejects.toMatchObject({
        code: PersistenceErrorCode.ShuttingDown,
      });
      expect(factory.created).toHaveLength(1);
      expect(sources.activeShards()).toEqual([]);
    });

    it('does not keep a shard that was moving to another instance while it closed', async () => {
      const factory = new FakeDataSourceFactory();
      const sources = buildSources(new FixedClock(), factory);
      await sources.get(SHARD_A);

      const moving = sources.get({ ...SHARD_A, instance: 'instance-2' });
      await sources.close();

      await expect(moving).rejects.toMatchObject({
        code: PersistenceErrorCode.ShuttingDown,
      });
      expect(factory.created).toHaveLength(1);
      expect(sources.activeShards()).toEqual([]);
    });
  });
});
