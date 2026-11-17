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
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { TenantDirectory } from '../domain/tenant-directory.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import type { Tenant } from '../domain/tenant.js';

/**
 * Activa, suspende, reactiva y descarta tenants. Suspender escribe `auth:epoch:tenant:{id}` con
 * `suspended`, así cada servicio rechaza los tokens del tenant sin consultar a identity.
 */
@Injectable()
export class ChangeTenantStatus {
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly tenants: TenantRepository,
    private readonly directory: TenantDirectory,
    private readonly state: AuthStateWriter,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  activate(tenantId: string): Promise<TenantOperationResult> {
    return this.change(tenantId, async (tenant) => {
      if (tenant.activate()) {
        await this.tenants.update(tenant);
      }
    });
  }

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
   * Borra un tenant que nunca quedó activo. Uno activo o suspendido no se descarta: se responde su estado.
   * Si el tenant ya no existe responde `Deleting`: repetir el descarte es inocuo.
   */
  async discard(tenantId: string): Promise<TenantOperationResult> {
    const tenant = await this.scopes.inTenantShard(tenantId, () =>
      this.tenants.find(tenantId),
    );
    if (tenant === undefined) {
      // Una compensación tolera que el paso ya se haya deshecho o nunca se haya aplicado.
      return { tenantId, status: TenantLifecycle.Deleting };
    }
    const state = tenant.snapshot();
    if (!tenant.canBeDiscarded()) {
      return { tenantId, status: state.status };
    }
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
