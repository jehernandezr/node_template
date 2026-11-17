import { Injectable } from '@nestjs/common';
import { PermissionsChangedEvent } from '@contracts/identity';
import { AuthStateWriter } from '@platform/auth';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';

/**
 * Avisa que subió una versión de permisos: publica `PermissionsChanged` en la transacción y, después del
 * commit, copia la versión a `auth:pv:*` para que los tokens viejos pidan refresh.
 */
@Injectable()
export class AccessVersionPublisher {
  constructor(
    private readonly bus: MessageBus,
    private readonly state: AuthStateWriter,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async tenantChanged(tenantId: string, tenantVersion: number): Promise<void> {
    await this.bus.publish(
      PermissionsChangedEvent,
      {
        tenantId,
        permissionVersion: `${tenantVersion}.0`,
        changedAt: this.clock.now().toISOString(),
      },
      { tenantId },
    );
    this.transactions.afterCommit(() =>
      this.state.setPermissionVersion(tenantId, undefined, tenantVersion),
    );
  }

  async memberChanged(
    tenantId: string,
    userId: string,
    tenantVersion: number,
    memberVersion: number,
  ): Promise<void> {
    await this.bus.publish(
      PermissionsChangedEvent,
      {
        tenantId,
        userId,
        permissionVersion: `${tenantVersion}.${memberVersion}`,
        changedAt: this.clock.now().toISOString(),
      },
      { tenantId },
    );
    this.transactions.afterCommit(() =>
      this.state.setPermissionVersion(tenantId, userId, memberVersion),
    );
  }
}
