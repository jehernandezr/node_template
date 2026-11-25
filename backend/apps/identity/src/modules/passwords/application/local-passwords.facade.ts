import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { TransactionManager } from '@platform/kernel';
import { PasswordCredentialRepository } from '../domain/password-credential.repository.js';
import { PasswordAcceptance } from './password-acceptance.js';
import { PasswordVerifier } from './password-verifier.js';
import { PasswordsFacade } from './passwords.facade.js';

/** `PasswordsFacade` inside the process. */
@Injectable()
export class LocalPasswordsFacade extends PasswordsFacade {
  constructor(
    private readonly verifier: PasswordVerifier,
    private readonly acceptance: PasswordAcceptance,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly credentials: PasswordCredentialRepository,
  ) {
    super();
  }

  /** {@inheritDoc PasswordsFacade.verify} */
  verify(ref: UserRef | undefined, password: string): Promise<boolean> {
    return this.verifier.verify(ref, password);
  }

  /**
   * Joins the transaction of the user shard if the caller already opened it, as the registration does.
   * {@inheritDoc PasswordsFacade.setInitial}
   */
  async setInitial(ref: UserRef, password: string): Promise<void> {
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(() =>
        this.verifier.store(ref, password),
      ),
    );
  }

  /** {@inheritDoc PasswordsFacade.assertAcceptable} */
  assertAcceptable(password: string, email: string): Promise<void> {
    return this.acceptance.assert(password, email);
  }

  /** {@inheritDoc PasswordsFacade.forget} */
  async forget(ref: UserRef): Promise<void> {
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(() =>
        this.credentials.delete(ref.userId),
      ),
    );
  }
}
