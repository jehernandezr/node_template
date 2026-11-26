import { ActingUser } from '@platform/auth';
import { ShardScopes } from '@platform/persistence';
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
import { SecurityAlerts } from '../../alerts/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UsersFacade } from '../../users/index.js';
import { PasswordAcceptance } from './password-acceptance.js';
import { PasswordVerifier } from './password-verifier.js';

/** Changes the password of the current session (requires step-up) and closes the other sessions. */
@Injectable()
export class ChangePassword {
  constructor(
    private readonly verifier: PasswordVerifier,
    private readonly acceptance: PasswordAcceptance,
    private readonly users: UsersFacade,
    private readonly sessions: SessionsFacade,
    private readonly alerts: SecurityAlerts,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  async execute(
    actor: UserActor,
    request: ChangePasswordRequest,
  ): Promise<void> {
    const ref = ActingUser.refOf(actor);
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
