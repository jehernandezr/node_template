import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  RevocationReason,
  SecurityAlertType,
  type PasswordResetConfirmRequest,
} from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UsersFacade } from '../../users/index.js';
import { PasswordAcceptance } from './password-acceptance.js';
import { PasswordResetTokens } from './password-reset-tokens.js';
import { PasswordVerifier } from './password-verifier.js';

/**
 * Resets the password with the emailed token and closes every session. Redeeming the token, storing the new
 * password and revoking the sessions commit in the same transaction of the user shard: a reset is never
 * confirmed with the sessions still open, and if the password breaks the policy the token still serves
 * another attempt.
 */
@Injectable()
export class ConfirmPasswordReset {
  constructor(
    private readonly resets: PasswordResetTokens,
    private readonly verifier: PasswordVerifier,
    private readonly acceptance: PasswordAcceptance,
    private readonly users: UsersFacade,
    private readonly sessions: SessionsFacade,
    private readonly alerts: SecurityAlerts,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Confirms a password reset.
   * @param request Emailed token and the new password.
   * @throws IdentityError `IDENTITY.PASSWORD.RESET_INVALID` if the token is unknown, used or expired.
   * @throws IdentityError `IDENTITY.PASSWORD.POLICY_VIOLATION` or `IDENTITY.PASSWORD.BREACHED` for a weak password.
   */
  async execute(request: PasswordResetConfirmRequest): Promise<void> {
    const ref = this.resets.ownerOf(request.token);
    if (ref === undefined) {
      throw new IdentityError(IdentityErrorCode.PasswordResetInvalid);
    }
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        if (!(await this.resets.redeem(request.token))) {
          throw new IdentityError(IdentityErrorCode.PasswordResetInvalid);
        }
        const user = await this.users.getByRef(ref);
        await this.acceptance.assert(request.newPassword, user.email);
        await this.verifier.store(ref, request.newPassword);
        await this.sessions.revokeUserSessions(
          ref,
          RevocationReason.PasswordChanged,
        );
      }),
    );
    await this.alerts.raise({
      type: SecurityAlertType.PasswordRecovered,
      user: ref,
    });
  }
}
