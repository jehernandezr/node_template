import { Injectable } from '@nestjs/common';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { TransactionManager } from '@platform/kernel';
import { PasswordCredentialRepository } from '../domain/password-credential.repository.js';
import { PasswordAcceptance } from './password-acceptance.js';
import { PasswordVerifier } from './password-verifier.js';
import { PasswordsFacade } from './passwords.facade.js';

/** `PasswordsFacade` dentro del proceso. */
@Injectable()
export class LocalPasswordsFacade extends PasswordsFacade {
  constructor(
    private readonly verifier: PasswordVerifier,
    private readonly acceptance: PasswordAcceptance,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly credentials: PasswordCredentialRepository,
  ) {
    super();
  }

  verify(ref: UserRef | undefined, password: string): Promise<boolean> {
    return this.verifier.verify(ref, password);
  }

  /** Se une a la transacción del shard del usuario si quien llama ya la abrió, como el registro. */
  async setInitial(ref: UserRef, password: string): Promise<void> {
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(() =>
        this.verifier.store(ref, password),
      ),
    );
  }

  assertAcceptable(password: string, email: string): Promise<void> {
    return this.acceptance.assert(password, email);
  }

  async forget(ref: UserRef): Promise<void> {
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(() =>
        this.credentials.delete(ref.userId),
      ),
    );
  }
}
