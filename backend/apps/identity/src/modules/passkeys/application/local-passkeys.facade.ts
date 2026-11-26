import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import {
  PasskeyDirectory,
  PasskeyRepository,
} from '../domain/passkey-store.js';
import { PasskeyCeremony } from './passkey-ceremony.js';
import { PasskeysFacade } from './passkeys.facade.js';

/** Tells the second factor whether a user has passkeys, and erases or relocates them with the account and its tenant. */
@Injectable()
export class LocalPasskeysFacade extends PasskeysFacade {
  constructor(
    private readonly ceremony: PasskeyCeremony,
    private readonly passkeys: PasskeyRepository,
    private readonly directory: PasskeyDirectory,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {
    super();
  }

  override async hasPasskeys(user: UserRef): Promise<boolean> {
    return (await this.ceremony.userPasskeys(user)).length > 0;
  }

  /** Deletes the shard's ones first and then the index: a retry finds them while any remain. */
  override async forget(user: UserRef): Promise<void> {
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

  override relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void> {
    return this.directory.relocateHomeTenant(homeTenantId, region);
  }
}
