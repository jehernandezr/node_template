import {
  ShardKey,
  ShardingErrorCode,
  TransactionShardGuard,
} from '@platform/sharding';
import type { ShardScopeInit } from '../model/shard-scope-init.js';
import { StubShardedLayer } from './utils/stub-sharded-layer.js';

const TENANT_A = StubShardedLayer.TENANT_A;
const TENANT_B = StubShardedLayer.TENANT_B;
const INIT_A: ShardScopeInit = { tenantId: TENANT_A, keyKind: ShardKey.Tenant };
const INIT_B: ShardScopeInit = { tenantId: TENANT_B, keyKind: ShardKey.Tenant };

describe('ShardScope', () => {
  describe('outside any run', () => {
    it('has no current scope', () => {
      const layer = new StubShardedLayer();

      expect(layer.scope.current()).toBeUndefined();
    });
  });

  describe('inside a run', () => {
    it('exposes the init that opened it', async () => {
      const layer = new StubShardedLayer();

      const inside = await layer.scope.run(INIT_A, () =>
        Promise.resolve(layer.scope.current()),
      );

      expect(inside).toEqual(INIT_A);
    });
  });

  describe('when runs are nested', () => {
    it('shows the inner scope inside and the outer scope again after it', async () => {
      const layer = new StubShardedLayer();

      const seen = await layer.scope.run(INIT_A, async () => {
        const inner = await layer.scope.run(INIT_B, () =>
          Promise.resolve(layer.scope.current()),
        );
        return { inner, outer: layer.scope.current() };
      });

      expect(seen).toEqual({ inner: INIT_B, outer: INIT_A });
    });
  });

  describe('inside a transaction that already touched shard A', () => {
    it('rejects a scope of tenant B with CROSS_SHARD_TX', () =>
      TransactionShardGuard.run(async () => {
        TransactionShardGuard.current()?.touch(StubShardedLayer.SHARD_A);
        const layer = new StubShardedLayer();

        await expect(
          layer.scope.run(INIT_B, () => Promise.resolve()),
        ).rejects.toMatchObject({
          code: ShardingErrorCode.CrossShardTransaction,
        });
      }));

    it('accepts a scope of tenant A', () =>
      TransactionShardGuard.run(async () => {
        TransactionShardGuard.current()?.touch(StubShardedLayer.SHARD_A);
        const layer = new StubShardedLayer();

        await expect(
          layer.scope.run(INIT_A, () => Promise.resolve('same shard')),
        ).resolves.toBe('same shard');
      }));
  });
});
