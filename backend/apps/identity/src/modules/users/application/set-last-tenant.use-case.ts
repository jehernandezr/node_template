import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { UserRepository } from '../domain/user.repository.js';

/** Remembers the user's last tenant: the next sign-in opens there. */
@Injectable()
export class SetLastTenant {
  constructor(
    private readonly users: UserRepository,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Records the last tenant the user worked in, used as the default at sign-in.
   * @param ref User.
   * @param tenantId Last tenant.
   */
  async execute(ref: UserRef, tenantId: string): Promise<void> {
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const user = await this.users.find(ref.userId);
        if (user === undefined || user.snapshot().lastTenantId === tenantId) {
          return;
        }
        user.setLastTenant(tenantId);
        await this.users.update(user);
      }),
    );
  }
}
