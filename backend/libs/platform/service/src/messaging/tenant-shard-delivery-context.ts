import { DeliveryContext, type MessageEnvelope } from '@platform/messaging';
import type { RequestContextStore } from '@platform/observability';
import type { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';

/**
 * Runs each delivery in the shard of the envelope's tenant and with that tenant in the context. With `requireScope`
 * the `processed_messages` claim has no other way of knowing which database to go to, and the handler
 * transactions set `app.tenant_id` from the context. It does not open a transaction: the handler may touch other
 * shards (for example the user's), so it commits its effects on its own and must be idempotent.
 */
export class TenantShardDeliveryContext extends DeliveryContext {
  constructor(
    private readonly scope: ShardScope,
    private readonly context: RequestContextStore,
  ) {
    super();
  }

  override run(
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ): Promise<void> {
    const tenantId = envelope.tenantid;
    if (tenantId === undefined) {
      return fn();
    }
    return this.context.run(
      {
        ...this.context.current(),
        tenantId,
        ...(envelope.actorid === undefined
          ? {}
          : { actorId: envelope.actorid }),
      },
      () => this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn),
    );
  }
}
