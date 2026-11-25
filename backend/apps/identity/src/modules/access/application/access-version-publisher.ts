import { Injectable } from '@nestjs/common';
import {
  PermissionsChangedEvent,
  type PermissionsChangedPayload,
} from '@contracts/identity';
import { AuthStateWriter, PermissionVersionCodec } from '@platform/auth';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';

/**
 * Announces that a permission version went up: it publishes `PermissionsChanged` in the transaction and,
 * after the commit, copies the version to `auth:pv:*` so old tokens ask for a refresh. `replay` copies it
 * again from the event, which survives a lost write; the store never moves a version back.
 */
@Injectable()
export class AccessVersionPublisher {
  constructor(
    private readonly bus: MessageBus,
    private readonly state: AuthStateWriter,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /**
   * Announces a new version of the tenant.
   * @param tenantId Tenant.
   * @param tenantVersion New tenant version.
   */
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

  /**
   * Announces a new version of a member.
   * @param tenantId Tenant.
   * @param userId Member.
   * @param tenantVersion Current tenant version.
   * @param memberVersion New member version.
   */
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

  /**
   * Copies again into `auth:pv:*` the version a published change carries.
   * @param event Published permission change.
   */
  async replay(event: PermissionsChangedPayload): Promise<void> {
    const version = PermissionVersionCodec.parse(event.permissionVersion);
    if (version === undefined) {
      return;
    }
    await (event.userId === undefined
      ? this.state.setPermissionVersion(
          event.tenantId,
          undefined,
          version.tenant,
        )
      : this.state.setPermissionVersion(
          event.tenantId,
          event.userId,
          version.user,
        ));
  }
}
