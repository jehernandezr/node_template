import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, type PlanFeature } from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { AccessFacade } from '../../access/index.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import { ChangeTenantStatus } from './change-tenant-status.use-case.js';

/**
 * What billing decides about a tenant that changes its access: suspension for delinquency, reactivation after
 * a payment and the features of the current plan.
 */
@Injectable()
export class ApplyBillingStanding {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly status: ChangeTenantStatus,
    private readonly access: AccessFacade,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  async suspended(tenantId: string): Promise<void> {
    await this.status.suspend(tenantId);
  }

  async reactivated(tenantId: string): Promise<void> {
    await this.status.reactivate(tenantId);
  }

  /**
   * Saves the plan's features and bumps the tenant's permissions version, unless the change arrives
   * after a later one. The version is bumped after committing: if the process crashes before, the retry
   * of the same decision applies it again and bumps it.
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
