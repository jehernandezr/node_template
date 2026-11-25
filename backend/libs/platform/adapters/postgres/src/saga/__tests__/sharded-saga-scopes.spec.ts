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
      directory: new InMemoryDirectoryStore(),
      clock: new FixedClock(),
    }),
  );
}

describe('ShardedSagaScopes', () => {
  it('rechaza una instancia sin tenant con PersistenceTenantRequired', async () => {
    const scopes = new ShardedSagaScopes(scopeOf());
    const instance = SagaInstanceBuilder.aSaga()
      .with({ context: null })
      .build();

    const error = await scopes
      .run(instance, async () => 'nunca')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PersistenceError);
    expect((error as PersistenceError).code).toBe(
      PersistenceErrorCode.TenantRequired,
    );
  });

  it('corre body con el tenant de la instancia fijado en el ámbito', async () => {
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

  it('devuelve lo que devuelve body', async () => {
    const scopes = new ShardedSagaScopes(scopeOf());
    const instance = SagaInstanceBuilder.aSaga()
      .with({ context: { tenantId: ShardedTestDatabase.TENANT_A } })
      .build();

    await expect(scopes.run(instance, async () => 42)).resolves.toBe(42);
  });
});
