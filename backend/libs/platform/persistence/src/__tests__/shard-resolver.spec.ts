import {
  ShardAccess,
  ShardKey,
  ShardingErrorCode,
  type ShardKeyResolver,
} from '@platform/sharding';
import { PersistenceFeature } from '../persistence-feature.js';
import type { ShardRequest } from '../model/shard-request.js';
import { StubShardedLayer } from './utils/stub-sharded-layer.js';

const TENANT_A = StubShardedLayer.TENANT_A;
const TENANT_B = StubShardedLayer.TENANT_B;
const USER_ID = 'user-1';

/** Lee `accountId` de la fuente cuando la trae como texto. */
class AccountKeyResolver implements ShardKeyResolver {
  resolve(source: unknown): string | undefined {
    if (
      typeof source === 'object' &&
      source !== null &&
      'accountId' in source &&
      typeof source.accountId === 'string'
    ) {
      return source.accountId;
    }
    return undefined;
  }
}

function requestFor(
  feature: PersistenceFeature,
  source?: unknown,
): ShardRequest {
  return { feature, source, access: ShardAccess.Read };
}

describe('ShardResolver', () => {
  describe('with ShardKey.Tenant', () => {
    it('routes each tenant to its own shard', async () => {
      const layer = new StubShardedLayer();
      const feature = new PersistenceFeature({ key: ShardKey.Tenant });

      layer.asTenant(TENANT_A);
      const handleA = await layer.resolver.resolve(requestFor(feature));
      layer.asTenant(TENANT_B);
      const handleB = await layer.resolver.resolve(requestFor(feature));

      expect(handleA.resolved.logicalShard).toBe(StubShardedLayer.SHARD_A);
      expect(handleB.resolved.logicalShard).toBe(StubShardedLayer.SHARD_B);
      expect(handleB.dataSource).toBe(
        layer.dataSource(StubShardedLayer.SHARD_B),
      );
    });
  });

  describe('with ShardKey.User', () => {
    it('rejects a request without a user', async () => {
      const layer = new StubShardedLayer();
      layer.asTenant(TENANT_A);
      const feature = new PersistenceFeature({ key: ShardKey.User });

      await expect(
        layer.resolver.resolve(requestFor(feature)),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.KeyMissing,
      });
    });

    it('resolves when the context has a user', async () => {
      const layer = new StubShardedLayer();
      layer.asTenant(TENANT_A, USER_ID);
      const feature = new PersistenceFeature({ key: ShardKey.User });

      const handle = await layer.resolver.resolve(requestFor(feature));

      expect(handle.resolved.logicalShard).toBe(StubShardedLayer.SHARD_A);
    });
  });

  describe('with ShardKey.Custom', () => {
    it('takes the key from the source', async () => {
      const layer = new StubShardedLayer();
      layer.asTenant(TENANT_A);
      const feature = new PersistenceFeature({
        key: ShardKey.Custom,
        keyResolver: new AccountKeyResolver(),
      });

      const handle = await layer.resolver.resolve(
        requestFor(feature, { accountId: 'account-1' }),
      );

      expect(handle.resolved.logicalShard).toBe(StubShardedLayer.SHARD_A);
    });

    it('rejects a source without a key', async () => {
      const layer = new StubShardedLayer();
      layer.asTenant(TENANT_A);
      const feature = new PersistenceFeature({
        key: ShardKey.Custom,
        keyResolver: new AccountKeyResolver(),
      });

      await expect(
        layer.resolver.resolve(requestFor(feature)),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.KeyMissing,
      });
    });
  });

  describe('without a tenant in the context', () => {
    it('rejects with KEY_MISSING', async () => {
      const layer = new StubShardedLayer();
      const feature = new PersistenceFeature({ key: ShardKey.Tenant });

      await expect(
        layer.resolver.resolve(requestFor(feature)),
      ).rejects.toMatchObject({
        code: 'PLATFORM.SHARDING.KEY_MISSING',
      });
    });
  });

  describe('with requireScope and no scope', () => {
    it('rejects with KEY_MISSING even when the context has a tenant', async () => {
      const layer = new StubShardedLayer(true);
      layer.asTenant(TENANT_A);
      const feature = new PersistenceFeature({ key: ShardKey.Tenant });

      await expect(
        layer.resolver.resolve(requestFor(feature)),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.KeyMissing,
      });
    });
  });

  describe('inside a scope of another tenant', () => {
    it('resolves the scope shard instead of the context shard', async () => {
      const layer = new StubShardedLayer();
      layer.asTenant(TENANT_A);
      const feature = new PersistenceFeature({ key: ShardKey.Tenant });

      const handle = await layer.scope.run(
        { tenantId: TENANT_B, keyKind: ShardKey.Tenant },
        () => layer.resolver.resolve(requestFor(feature)),
      );

      expect(handle.resolved.logicalShard).toBe(StubShardedLayer.SHARD_B);
    });
  });
});
