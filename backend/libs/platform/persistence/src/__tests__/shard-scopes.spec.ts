import {
  ActorType,
  RequestContextStore,
  Redactor,
  Tracing,
} from '@platform/observability';
import {
  ShardKey,
  ShardingErrorCode,
  TransactionShardGuard,
} from '@platform/sharding';
import { ShardScopes } from '../shard-scopes.js';
import { StubShardedLayer } from './utils/stub-sharded-layer.js';

const TENANT_A = StubShardedLayer.TENANT_A;
const TENANT_B = StubShardedLayer.TENANT_B;
const USER_ID = '0193f1c2-0000-7000-8000-0000000000aa';

class ScopesFixture {
  readonly layer = new StubShardedLayer();
  readonly context = new RequestContextStore(new Tracing(new Redactor()));
  readonly scopes = new ShardScopes(this.layer.scope, this.context);
}

describe('ShardScopes', () => {
  describe('inTenantShard', () => {
    it('opens the tenant scope and puts the tenant in the request context', async () => {
      const fixture = new ScopesFixture();

      const seen = await fixture.scopes.inTenantShard(TENANT_A, () =>
        Promise.resolve({
          scope: fixture.layer.scope.current(),
          tenantId: fixture.context.current()?.tenantId,
        }),
      );

      expect(seen).toEqual({
        scope: { tenantId: TENANT_A, keyKind: ShardKey.Tenant },
        tenantId: TENANT_A,
      });
    });

    it('keeps the rest of the context and replaces only its tenant', async () => {
      const fixture = new ScopesFixture();

      const seen = await fixture.context.run(
        { tenantId: TENANT_B, actorType: ActorType.User, userId: USER_ID },
        () =>
          fixture.scopes.inTenantShard(TENANT_A, () =>
            Promise.resolve(fixture.context.current()),
          ),
      );

      expect(seen).toMatchObject({
        tenantId: TENANT_A,
        actorType: ActorType.User,
        userId: USER_ID,
      });
    });

    it('restores the caller tenant after the block', async () => {
      const fixture = new ScopesFixture();

      const after = await fixture.context.run(
        { tenantId: TENANT_B },
        async () => {
          await fixture.scopes.inTenantShard(TENANT_A, () => Promise.resolve());
          return fixture.context.current()?.tenantId;
        },
      );

      expect(after).toBe(TENANT_B);
    });

    it('rejects a tenant of another shard inside an open transaction', () =>
      TransactionShardGuard.run(async () => {
        TransactionShardGuard.current()?.touch(StubShardedLayer.SHARD_A);
        const fixture = new ScopesFixture();

        await expect(
          fixture.scopes.inTenantShard(TENANT_B, () => Promise.resolve()),
        ).rejects.toMatchObject({
          code: ShardingErrorCode.CrossShardTransaction,
        });
      }));
  });

  describe('inUserShard', () => {
    it('opens the user scope in the shard of their home tenant', async () => {
      const fixture = new ScopesFixture();

      const seen = await fixture.scopes.inUserShard(
        { userId: USER_ID, homeTenantId: TENANT_B },
        () => Promise.resolve(fixture.layer.scope.current()),
      );

      expect(seen).toEqual({
        tenantId: TENANT_B,
        keyKind: ShardKey.User,
        keyValue: USER_ID,
      });
    });

    it('leaves the request context tenant untouched', async () => {
      const fixture = new ScopesFixture();

      const seen = await fixture.context.run({ tenantId: TENANT_A }, () =>
        fixture.scopes.inUserShard(
          { userId: USER_ID, homeTenantId: TENANT_B },
          () => Promise.resolve(fixture.context.current()?.tenantId),
        ),
      );

      expect(seen).toBe(TENANT_A);
    });
  });
});
