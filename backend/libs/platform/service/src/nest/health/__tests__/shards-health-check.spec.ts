import { HealthState } from '@platform/kernel';
import type { ShardLocation } from '@platform/persistence';
import { StaticShardLister } from '@platform/persistence/test-utils';
import { ShardsHealthCheck } from '../shards-health-check.js';
import { HealthProbeQuery } from '../health-probe-query.enum.js';
import {
  ConnectionFailedError,
  FakeDataSource,
  FakeShardDataSources,
  ProbeErrorName,
} from './utils/index.js';

const SHARD_A: ShardLocation = {
  logicalShard: 'svc_shard_0',
  instance: 'main',
};
const SHARD_B: ShardLocation = {
  logicalShard: 'svc_shard_1',
  instance: 'main',
};

describe('ShardsHealthCheck', () => {
  describe('when the directory lists no shards', () => {
    it('reports up without touching any shard', async () => {
      const sources = new FakeShardDataSources(() => new FakeDataSource());
      const check = new ShardsHealthCheck(
        new StaticShardLister([]),
        sources.asShardDataSources(),
      );

      await expect(check.check()).resolves.toEqual({ state: HealthState.Up });
      expect(sources.requested).toEqual([]);
    });
  });

  describe('when the directory lists shards', () => {
    it('runs the probe query on every listed shard', async () => {
      const dataSource = new FakeDataSource();
      const sources = new FakeShardDataSources(() => dataSource);
      const check = new ShardsHealthCheck(
        new StaticShardLister([SHARD_A, SHARD_B]),
        sources.asShardDataSources(),
      );

      await expect(check.check()).resolves.toEqual({ state: HealthState.Up });
      expect(sources.requested).toEqual([SHARD_A, SHARD_B]);
      expect(dataSource.queries).toEqual([
        HealthProbeQuery.SelectOne,
        HealthProbeQuery.SelectOne,
      ]);
    });

    it('rejects when a single shard fails', async () => {
      const error = new ConnectionFailedError();
      const sources = new FakeShardDataSources((location) =>
        location.logicalShard === SHARD_B.logicalShard
          ? FakeDataSource.failingWith(error)
          : new FakeDataSource(),
      );
      const check = new ShardsHealthCheck(
        new StaticShardLister([SHARD_A, SHARD_B]),
        sources.asShardDataSources(),
      );

      await expect(check.check()).rejects.toBe(error);
    });
  });

  describe('when the signal is already aborted', () => {
    it('rejects without listing the shards', async () => {
      const lister = new StaticShardLister([SHARD_A]);
      const sources = new FakeShardDataSources(() => new FakeDataSource());
      const check = new ShardsHealthCheck(lister, sources.asShardDataSources());

      await expect(check.check(AbortSignal.abort())).rejects.toMatchObject({
        name: ProbeErrorName.Abort,
      });
      expect(sources.requested).toEqual([]);
    });
  });
});
