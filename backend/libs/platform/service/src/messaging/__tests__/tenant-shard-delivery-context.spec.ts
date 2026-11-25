import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardScope, type ShardScopeInit } from '@platform/persistence';
import { ShardKey, ShardRouter } from '@platform/sharding';
import {
  InMemoryDirectoryStore,
  TestTenants,
} from '@platform/sharding/test-utils';
import { TenantShardDeliveryContext } from '../tenant-shard-delivery-context.js';

class DeliveryHarness {
  readonly scope = new ShardScope(
    new ShardRouter({ directory: new InMemoryDirectoryStore() }),
  );
  readonly context = new RequestContextStore(new Tracing(new Redactor()));
  readonly delivery = new TenantShardDeliveryContext(this.scope, this.context);

  /** What the handler sees while it runs: the shard scope and the tenant and actor of the context. */
  async observe(tenantid?: string, actorid?: string) {
    let seen:
      | { scope?: ShardScopeInit; tenantId?: string; actorId?: string }
      | undefined;
    await this.delivery.run(
      EnvelopeBuilder.anEnvelope({
        ...(tenantid === undefined ? {} : { tenantid }),
        ...(actorid === undefined ? {} : { actorid }),
      }),
      async () => {
        const current = this.context.current();
        seen = {
          ...(this.scope.current() === undefined
            ? {}
            : { scope: this.scope.current() }),
          ...(current?.tenantId === undefined
            ? {}
            : { tenantId: current.tenantId }),
          ...(current?.actorId === undefined
            ? {}
            : { actorId: current.actorId }),
        };
      },
    );
    return seen;
  }
}

describe('TenantShardDeliveryContext', () => {
  describe('when the envelope names a tenant', () => {
    it('runs the delivery in the shard of the tenant with the tenant and actor in the context', async () => {
      const seen = await new DeliveryHarness().observe(
        TestTenants.One,
        TestTenants.Two,
      );

      expect(seen).toEqual({
        scope: { tenantId: TestTenants.One, keyKind: ShardKey.Tenant },
        tenantId: TestTenants.One,
        actorId: TestTenants.Two,
      });
    });
  });

  describe('when the envelope has no tenant', () => {
    it('runs the delivery without a shard scope', async () => {
      await expect(new DeliveryHarness().observe()).resolves.toEqual({});
    });
  });
});
