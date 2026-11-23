import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, type PlanFeature } from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { AccessFacade } from '../../access/index.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import { ChangeTenantStatus } from './change-tenant-status.use-case.js';

/**
 * Lo que billing decide sobre un tenant y cambia su acceso: la suspensión por morosidad, la reactivación por
 * un pago y las funcionalidades del plan vigente.
 */
@Injectable()
export class ApplyBillingStanding {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly status: ChangeTenantStatus,
    private readonly access: AccessFacade,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  async suspended(tenantId: string): Promise<void> {
    await this.status.suspend(tenantId);
  }

  async reactivated(tenantId: string): Promise<void> {
    await this.status.reactivate(tenantId);
  }

  /**
   * Guarda las funcionalidades del plan y sube la versión de permisos del tenant, salvo que el cambio llegue
   * después de otro posterior. La versión se sube después de confirmar: si el proceso cae antes, el reintento
   * de la misma decisión la vuelve a aplicar y la sube.
   */
  async planChanged(
    tenantId: string,
    features: readonly PlanFeature[],
    changedAt: Date,
  ): Promise<void> {
    const applied = await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const tenant = await this.tenants.find(tenantId);
        if (tenant === undefined) {
          throw new IdentityError(IdentityErrorCode.TenantNotFound);
        }
        if (!tenant.applyPlan(features, changedAt)) {
          return false;
        }
        await this.tenants.update(tenant);
        return true;
      }),
    );
    if (applied) {
      await this.access.refreshTenant(tenantId);
    }
  }
}
