import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import {
  PasskeyDirectory,
  PasskeyRepository,
} from '../domain/passkey-store.js';
import { PasskeyCeremony } from './passkey-ceremony.js';
import { PasskeysFacade } from './passkeys.facade.js';

/** `PasskeysFacade` dentro del proceso. */
@Injectable()
export class LocalPasskeysFacade extends PasskeysFacade {
  constructor(
    private readonly ceremony: PasskeyCeremony,
    private readonly passkeys: PasskeyRepository,
    private readonly directory: PasskeyDirectory,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {
    super();
  }

  async hasPasskeys(user: UserRef): Promise<boolean> {
    return (await this.ceremony.userPasskeys(user)).length > 0;
  }

  /** Borra primero las del shard y después el índice: un reintento las encuentra mientras queden. */
  async forget(user: UserRef): Promise<void> {
    const removed = await this.scopes.inUserShard(user, () =>
      this.transactions.runInTransaction(async () => {
        const passkeys = await this.passkeys.list(user.userId);
        for (const passkey of passkeys) {
          await this.passkeys.delete(user.userId, passkey.id);
        }
        return passkeys;
      }),
    );
    for (const passkey of removed) {
      await this.directory.remove(passkey.credentialId);
    }
  }

  relocateHomeTenant(homeTenantId: string, region: string): Promise<void> {
    return this.directory.relocateHomeTenant(homeTenantId, region);
  }
}
