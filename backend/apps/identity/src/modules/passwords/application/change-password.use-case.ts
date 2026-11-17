import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  RevocationReason,
  SecurityAlertType,
  type ChangePasswordRequest,
} from '@contracts/identity';
import type { UserActor } from '@platform/auth';
import { TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { userRefOf } from '../../../shared/utils/user-actor.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UsersFacade } from '../../users/index.js';
import { PasswordAcceptance } from './password-acceptance.js';
import { PasswordVerifier } from './password-verifier.js';

/** Cambia la contraseña de la sesión actual (pide step-up) y cierra las demás sesiones. */
@Injectable()
export class ChangePassword {
  constructor(
    private readonly verifier: PasswordVerifier,
    private readonly acceptance: PasswordAcceptance,
    private readonly users: UsersFacade,
    private readonly sessions: SessionsFacade,
    private readonly alerts: SecurityAlerts,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  async execute(
    actor: UserActor,
    request: ChangePasswordRequest,
  ): Promise<void> {
    const ref = userRefOf(actor);
    if (!(await this.verifier.verify(ref, request.currentPassword))) {
      throw new IdentityError(IdentityErrorCode.PasswordCurrentInvalid);
    }
    const user = await this.users.getByRef(ref);
    await this.acceptance.assert(request.newPassword, user.email);
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(() =>
        this.verifier.store(ref, request.newPassword),
      ),
    );
    await this.sessions.revokeUserSessions(
      ref,
      RevocationReason.PasswordChanged,
      {
        except: actor.sessionId,
      },
    );
    await this.alerts.raise({
      type: SecurityAlertType.PasswordChanged,
      user: ref,
    });
  }
}
