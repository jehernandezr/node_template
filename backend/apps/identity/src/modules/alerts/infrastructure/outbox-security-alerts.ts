import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { SecurityAlertRaisedEvent } from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import type { SecurityAlert } from '../domain/security-alert.js';
import { SecurityAlerts } from '../domain/security-alerts.js';

/**
 * Publishes `identity.security-alert.raised.v1` through the outbox of the user shard. If the caller already has
 * a transaction on that shard, the alert goes out with it; otherwise, it opens its own.
 */
@Injectable()
export class OutboxSecurityAlerts extends SecurityAlerts {
  constructor(
    private readonly bus: MessageBus,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {
    super();
  }

  /**
   * Published outside a tenant request (at sign-in, for example): the envelope tenant is the user's home tenant, which is where the alert consumers locate them.
   */
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
          { tenantId: alert.user.homeTenantId },
        );
      }),
    );
  }
}
