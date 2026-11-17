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
 * Restablece la contraseña con el token del correo y cierra todas las sesiones. El canje del token y la
 * contraseña nueva se confirman en la misma transacción del shard del usuario: si la contraseña no cumple
 * la política, el token sigue sirviendo para otro intento.
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
      }),
    );
    await this.sessions.revokeUserSessions(
      ref,
      RevocationReason.PasswordChanged,
    );
    await this.alerts.raise({
      type: SecurityAlertType.PasswordRecovered,
      user: ref,
    });
  }
}
