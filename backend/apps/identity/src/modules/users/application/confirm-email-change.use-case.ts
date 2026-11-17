import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  SecurityAlertType,
  UserEmailChangedEvent,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { EmailFingerprinter } from '../domain/email-fingerprinter.js';
import {
  EmailProofPurpose,
  EmailProofStore,
} from '../domain/email-proof-store.js';
import { UserDirectory } from '../domain/user-directory.js';
import { UserRepository } from '../domain/user.repository.js';

/**
 * Confirma el cambio de email de la sesión actual con el token enviado a la dirección nueva. Mueve primero
 * el índice del catálogo, que decide si el email sigue libre, y después el usuario en su shard.
 */
@Injectable()
export class ConfirmEmailChange {
  constructor(
    private readonly proofs: EmailProofStore,
    private readonly users: UserRepository,
    private readonly directory: UserDirectory,
    private readonly fingerprints: EmailFingerprinter,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly alerts: SecurityAlerts,
    private readonly clock: Clock,
  ) {}

  async execute(ref: UserRef, token: string): Promise<void> {
    const proof = await this.proofs.consume(EmailProofPurpose.Change, token);
    if (proof === undefined || proof.userId !== ref.userId) {
      throw new IdentityError(IdentityErrorCode.UserEmailVerificationInvalid);
    }
    const user = await this.scopes.inUserShard(ref, () =>
      this.users.find(ref.userId),
    );
    if (user === undefined) {
      throw new IdentityError(IdentityErrorCode.UserNotFound);
    }
    const next = this.fingerprints.fingerprint(proof.email);
    const moved = await this.directory.moveEmail(
      ref.userId,
      user.snapshot().emailFingerprint,
      next,
    );
    if (!moved) {
      throw new IdentityError(IdentityErrorCode.UserEmailVerificationInvalid);
    }
    const now = this.clock.now();
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const fresh = await this.users.find(ref.userId);
        if (fresh === undefined) {
          throw new IdentityError(IdentityErrorCode.UserNotFound);
        }
        fresh.changeEmail(proof.email, next, now);
        await this.users.update(fresh);
        await this.bus.publish(
          UserEmailChangedEvent,
          { userId: ref.userId, changedAt: now.toISOString() },
          { tenantId: ref.homeTenantId },
        );
      }),
    );
    await this.alerts.raise({
      type: SecurityAlertType.EmailChanged,
      user: ref,
    });
  }
}
