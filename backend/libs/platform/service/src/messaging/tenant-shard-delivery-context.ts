import { DeliveryContext, type MessageEnvelope } from '@platform/messaging';
import type { RequestContextStore } from '@platform/observability';
import type { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';

/**
 * Corre cada entrega en el shard del tenant del sobre y con ese tenant en el contexto. Con `requireScope`
 * el claim de `processed_messages` no tiene otra forma de saber a qué base ir, y las transacciones del
 * manejador fijan `app.tenant_id` desde el contexto. No abre transacción: el manejador puede tocar otros
 * shards (por ejemplo el del usuario), así que confirma sus efectos por su cuenta y debe ser idempotente.
 */
export class TenantShardDeliveryContext extends DeliveryContext {
  constructor(
    private readonly scope: ShardScope,
    private readonly context: RequestContextStore,
  ) {
    super();
  }

  run(envelope: MessageEnvelope, fn: () => Promise<void>): Promise<void> {
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
