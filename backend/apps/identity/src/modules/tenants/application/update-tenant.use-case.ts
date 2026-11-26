import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  type TenantSummary,
  type UpdateTenantRequest,
} from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import { TenantSummaryView } from './tenant-summary-view.js';

/** Changes the name of the active tenant. */
@Injectable()
export class UpdateTenant {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Renames a tenant.
   * @param tenantId Tenant to change.
   * @param changes New name.
   * @returns The changed tenant.
   */
  async execute(
    tenantId: string,
    changes: UpdateTenantRequest,
  ): Promise<TenantSummary> {
    const tenant = await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const found = await this.tenants.find(tenantId);
        if (found === undefined) {
          throw new IdentityError(IdentityErrorCode.TenantNotFound);
        }
        if (changes.name !== undefined) {
          found.rename(changes.name);
          await this.tenants.update(found);
        }
        return found;
      }),
    );
    return TenantSummaryView.summary(
      TenantSummaryView.snapshot(tenant.snapshot()),
    );
  }
}
