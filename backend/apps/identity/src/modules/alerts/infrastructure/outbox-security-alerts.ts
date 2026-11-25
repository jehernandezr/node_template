import { Injectable } from '@nestjs/common';
import { SecurityAlertRaisedEvent } from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { SecurityAlert } from '../domain/security-alert.js';
import { SecurityAlerts } from '../domain/security-alerts.js';

/**
 * Publica `identity.security-alert.raised.v1` por el outbox del shard del usuario. Si quien llama ya tiene
 * una transacción en ese shard, el aviso sale con ella; si no, abre una propia.
 */
@Injectable()
export class OutboxSecurityAlerts extends SecurityAlerts {
  constructor(
    private readonly bus: MessageBus,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {
    super();
  }

  async raise(alert: SecurityAlert): Promise<void> {
    await this.scopes.inUserShard(alert.user, () =>
      this.transactions.runInTransaction(async () => {
        await this.bus.publish(
          SecurityAlertRaisedEvent,
          {
            alertId: this.ids.next().toString(),
            userId: alert.user.userId,
            type: alert.type,
            raisedAt: this.clock.now().toISOString(),
          },
          // Se publica fuera de una petición de tenant (al iniciar sesión, por ejemplo): el tenant del sobre es el de
          // origen del usuario, que es donde lo ubican quienes consumen el aviso.
          { tenantId: alert.user.homeTenantId },
        );
      }),
    );
  }
}
