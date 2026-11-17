import { Injectable } from '@nestjs/common';
import { IdentityErrorCode } from '@contracts/identity';
import { Clock, TransactionManager, UseCase } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import {
  EmailProofPurpose,
  EmailProofStore,
} from '../domain/email-proof-store.js';
import { UserRepository } from '../domain/user.repository.js';

/** Confirma el email con el token del correo y activa la cuenta. */
@Injectable()
export class ConfirmEmailVerification implements UseCase<string, void> {
  constructor(
    private readonly proofs: EmailProofStore,
    private readonly users: UserRepository,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(token: string): Promise<void> {
    const proof = await this.proofs.consume(
      EmailProofPurpose.Verification,
      token,
    );
    if (proof === undefined) {
      throw new IdentityError(IdentityErrorCode.UserEmailVerificationInvalid);
    }
    await this.scopes.inUserShard(proof, () =>
      this.transactions.runInTransaction(async () => {
        const user = await this.users.find(proof.userId);
        if (user === undefined || user.snapshot().email !== proof.email) {
          throw new IdentityError(
            IdentityErrorCode.UserEmailVerificationInvalid,
          );
        }
        if (user.verifyEmail(this.clock.now())) {
          await this.users.update(user);
        }
      }),
    );
  }
}
