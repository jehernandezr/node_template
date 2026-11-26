import { ConsistentHashStrategy } from '@platform/sharding';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  PersistenceError,
  ShardScope,
  PersistenceErrorCode,
} from '@platform/persistence';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import { ShardKey, ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { SagaInstanceBuilder } from '@platform/saga/test-utils';
import { ShardedSagaScopes } from '../sharded-saga-scopes.js';

/** Shard scope without a database: enough to see which key the scope pins. */
function scopeOf(): ShardScope {
  return new ShardScope(
    new ShardRouter({
      strategy: new ConsistentHashStrategy(),
      directory: new InMemoryDirectoryStore(),
      clock: new FixedClock(),
    }),
  );
}

describe('ShardedSagaScopes', () => {
  it('rejects an instance without a tenant with PersistenceTenantRequired', async () => {
    const scopes = new ShardedSagaScopes(scopeOf());
    const instance = SagaInstanceBuilder.aSaga()
      .with({ context: null })
      .build();

    const error = await scopes
      .run(instance, async () => 'never')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PersistenceError);
    expect((error as PersistenceError).code).toBe(
      PersistenceErrorCode.TenantRequired,
    );
  });

  it('runs body with the instance tenant set in the scope', async () => {
    const scope = scopeOf();
    const scopes = new ShardedSagaScopes(scope);
    const instance = SagaInstanceBuilder.aSaga()
      .with({ context: { tenantId: ShardedTestDatabase.TENANT_B } })
      .build();

    const seen = await scopes.run(instance, async () => ({
      tenantId: scope.current()?.tenantId,
      keyKind: scope.current()?.keyKind,
    }));

    expect(seen).toEqual({
      tenantId: ShardedTestDatabase.TENANT_B,
      keyKind: ShardKey.Tenant,
    });
  });

  it('returns what body returns', async () => {
    const scopes = new ShardedSagaScopes(scopeOf());
    const instance = SagaInstanceBuilder.aSaga()
      .with({ context: { tenantId: ShardedTestDatabase.TENANT_A } })
      .build();

    await expect(scopes.run(instance, async () => 42)).resolves.toBe(42);
  });
});
