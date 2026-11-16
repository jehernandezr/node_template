import { randomBytes } from 'node:crypto';
import { ShardScope } from '@platform/persistence';
import { ShardKey, ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { IdentityShardScopes } from '../identity-shard-scopes.js';

describe('IdentityShardScopes', () => {
  const build = (): { scopes: IdentityShardScopes; scope: ShardScope } => {
    const scope = new ShardScope(
      new ShardRouter({ directory: new InMemoryDirectoryStore() }),
    );
    return { scopes: new IdentityShardScopes(scope), scope };
  };

  it('runs a user block with the home tenant and the user id as key', async () => {
    const { scopes, scope } = build();
    const userId = randomBytes(8).toString('hex');
    const ref = { userId, homeTenantId: 'tenant-origen' };

    const seen = await scopes.inUserShard(ref, async () => scope.current());

    expect(seen).toEqual({
      tenantId: 'tenant-origen',
      keyKind: ShardKey.User,
      keyValue: userId,
    });
    expect(scope.current()).toBeUndefined();
  });

  it('runs a tenant block with the tenant key and no value', async () => {
    const { scopes, scope } = build();

    const seen = await scopes.inTenantShard('tenant-x', async () =>
      scope.current(),
    );

    expect(seen).toEqual({ tenantId: 'tenant-x', keyKind: ShardKey.Tenant });
  });

  it('returns the value of the block and propagates its failure', async () => {
    const { scopes } = build();
    const ref = { userId: 'u-1', homeTenantId: 't-1' };

    await expect(scopes.inUserShard(ref, async () => 42)).resolves.toBe(42);
    await expect(
      scopes.inUserShard(ref, async () => {
        throw new Error('fallo del bloque');
      }),
    ).rejects.toThrow('fallo del bloque');
  });
});
