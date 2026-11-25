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
 * Confirms the email change of the current session with the token sent to the new address. It first moves
 * the catalog index, which decides whether the email is still free, and then the user in their shard; if
 * the user shard fails, the index moves back, so the catalog never points the new email to a user who
 * still has the old one.
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

  /**
   * Confirms an email change.
   * @param ref User of the session.
   * @param token Token emailed to the new address.
   * @throws IdentityError `IDENTITY.USER.EMAIL_VERIFICATION_INVALID` if the token is not this user's or the
   *   new email was taken meanwhile.
   * @throws IdentityError `IDENTITY.USER.NOT_FOUND` if the user no longer exists.
   */
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
    const previous = user.snapshot().emailFingerprint;
    const next = this.fingerprints.fingerprint(proof.email);
    if (!(await this.directory.moveEmail(ref.userId, previous, next))) {
      throw new IdentityError(IdentityErrorCode.UserEmailVerificationInvalid);
    }
    try {
      await this.changeInShard(ref, proof.email, next);
    } catch (error) {
      await this.directory.moveEmail(ref.userId, next, previous);
      throw error;
    }
    await this.alerts.raise({
      type: SecurityAlertType.EmailChanged,
      user: ref,
    });
  }

  private async changeInShard(
    ref: UserRef,
    email: string,
    next: Buffer,
  ): Promise<void> {
    const now = this.clock.now();
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const fresh = await this.users.find(ref.userId);
        if (fresh === undefined) {
          throw new IdentityError(IdentityErrorCode.UserNotFound);
        }
        fresh.changeEmail(email, next, now);
        await this.users.update(fresh);
        await this.bus.publish(
          UserEmailChangedEvent,
          { userId: ref.userId, changedAt: now.toISOString() },
          { tenantId: ref.homeTenantId },
        );
      }),
    );
  }
}
