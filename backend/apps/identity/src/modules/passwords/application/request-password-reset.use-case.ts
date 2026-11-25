import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { SendPasswordResetCommand } from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentitySettings } from '../../../config/identity-settings.js';

/**
 * `POST /v1/auth/password-resets`: queues the request through the outbox of the default tenant shard and
 * answers. It never looks up the email, so the answer, its cost and what it writes are the same whether or not
 * an account has that email; `SendPasswordReset` decides in the worker whether an email goes out.
 */
@Injectable()
export class RequestPasswordReset {
  constructor(
    private readonly settings: IdentitySettings,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
  ) {}

  /**
   * Queues a password reset request.
   * @param email Email the request names.
   */
  async execute(email: string): Promise<void> {
    const tenantId = this.settings.values.IDENTITY_DEFAULT_TENANT_ID;
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.bus.send(SendPasswordResetCommand, { email }, { tenantId });
      }),
    );
  }
}
