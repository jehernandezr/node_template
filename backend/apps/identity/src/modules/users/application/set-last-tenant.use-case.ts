import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { UserRepository } from '../domain/user.repository.js';

/** Recuerda el último tenant del usuario: el próximo inicio de sesión abre ahí. */
@Injectable()
export class SetLastTenant {
  constructor(
    private readonly users: UserRepository,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

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
