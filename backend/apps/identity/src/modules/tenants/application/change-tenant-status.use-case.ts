import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  TenantReactivatedEvent,
  TenantLifecycle,
  TenantSuspendedEvent,
  type TenantOperationResult,
} from '@contracts/identity';
import { AuthStateWriter } from '@platform/auth';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { AccessFacade } from '../../access/index.js';
import { TenantDirectory } from '../domain/tenant-directory.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import type { Tenant } from '../domain/tenant.js';

/**
 * Activates, suspends, reactivates and discards tenants. Suspending writes `auth:epoch:tenant:{id}` with
 * `suspended`, so every service rejects the tokens of the tenant without asking identity.
 */
@Injectable()
export class ChangeTenantStatus {
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly tenants: TenantRepository,
    private readonly directory: TenantDirectory,
    private readonly access: AccessFacade,
    private readonly state: AuthStateWriter,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  /**
   * Activates a provisioned tenant.
   * @param tenantId Tenant.
   * @returns Its resulting status.
   * @throws IdentityError `IDENTITY.TENANT.NOT_FOUND` if it does not exist.
   */
  activate(tenantId: string): Promise<TenantOperationResult> {
    return this.change(tenantId, async (tenant) => {
      if (tenant.activate()) {
        await this.tenants.update(tenant);
      }
    });
  }

  /**
   * Suspends a tenant and rejects its tokens everywhere.
   * @param tenantId Tenant.
   * @returns Its resulting status.
   * @throws IdentityError `IDENTITY.TENANT.NOT_FOUND` if it does not exist.
   */
  async suspend(tenantId: string): Promise<TenantOperationResult> {
    const now = this.clock.now();
    const result = await this.change(tenantId, async (tenant) => {
      if (tenant.suspend()) {
        await this.tenants.update(tenant);
        await this.bus.publish(
          TenantSuspendedEvent,
          { tenantId, suspendedAt: now.toISOString() },
          { tenantId },
        );
      }
    });
    await this.state.setTenantEpoch(tenantId, {
      revokedBefore: this.seconds(now),
      suspended: true,
    });
    return result;
  }

  /**
   * Reactivates a suspended tenant.
   * @param tenantId Tenant.
   * @returns Its resulting status.
   * @throws IdentityError `IDENTITY.TENANT.NOT_FOUND` if it does not exist.
   */
  async reactivate(tenantId: string): Promise<TenantOperationResult> {
    const now = this.clock.now();
    const result = await this.change(tenantId, async (tenant) => {
      if (tenant.reactivate()) {
        await this.tenants.update(tenant);
        await this.bus.publish(
          TenantReactivatedEvent,
          { tenantId, reactivatedAt: now.toISOString() },
          { tenantId },
        );
      }
    });
    await this.state.setTenantEpoch(tenantId, {
      revokedBefore: this.seconds(now),
      suspended: false,
    });
    return result;
  }

  /**
   * Deletes a tenant that never became active, with all its access and the projections of its members.
   * An active or suspended tenant is not discarded: its status is answered. The access goes before the
   * tenant row, so a repetition after a partial run still finds the tenant and finishes; once the tenant is
   * gone it answers `Deleting`.
   * @param tenantId Tenant to discard.
   * @returns Its status before the discard, or `Deleting` if it no longer exists.
   */
  async discard(tenantId: string): Promise<TenantOperationResult> {
    const tenant = await this.scopes.inTenantShard(tenantId, () =>
      this.tenants.find(tenantId),
    );
    if (tenant === undefined) {
      return { tenantId, status: TenantLifecycle.Deleting };
    }
    const state = tenant.snapshot();
    if (!tenant.canBeDiscarded()) {
      return { tenantId, status: state.status };
    }
    await this.access.discardTenant(tenantId);
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(() => this.tenants.delete(tenantId)),
    );
    await this.directory.release(state.slug, tenantId);
    return { tenantId, status: state.status };
  }

  private async change(
    tenantId: string,
    apply: (tenant: Tenant) => Promise<void>,
  ): Promise<TenantOperationResult> {
    return this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const tenant = await this.tenants.find(tenantId);
        if (tenant === undefined) {
          throw new IdentityError(IdentityErrorCode.TenantNotFound);
        }
        await apply(tenant);
        return { tenantId, status: tenant.snapshot().status };
      }),
    );
  }

  private seconds(now: Date): number {
    return Math.floor(now.getTime() / ChangeTenantStatus.SECOND_MS);
  }
}
