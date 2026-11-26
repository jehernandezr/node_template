import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import { TenantAccessRepository } from '../domain/access-store.js';
import { AccessVersionPublisher } from './access-version-publisher.js';

/**
 * Bumps the tenant's permission version when something in the access of all its members changes (the
 * plan features): each service stops using the access it cached and the next token brings it fresh.
 */
@Injectable()
export class RefreshTenantAccess {
  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly versions: AccessVersionPublisher,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Bumps the access version of the whole tenant, so every token of it reloads its permissions.
   * @param tenantId Tenant to refresh.
   */
  execute(tenantId: string): Promise<void> {
    return this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.versions.tenantChanged(
          tenantId,
          await this.tenantAccess.bumpTenantVersion(),
        );
      }),
    );
  }
}
