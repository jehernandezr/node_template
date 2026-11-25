import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
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
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

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
