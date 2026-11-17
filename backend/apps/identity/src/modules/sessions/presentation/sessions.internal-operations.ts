import { Injectable } from '@nestjs/common';
import { InternalHandler } from '@platform/internal-api/nest';
import type { HandlerResult } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';
import {
  IdentityErrorCode,
  RevokeUserSessionsOperation,
  type RevokedSessions,
  type RevokeUserSessionsInput,
} from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { UsersFacade } from '../../users/index.js';
import { RevokeSessions } from '../application/revoke-sessions.use-case.js';

/** Operaciones internas de sessions. */
@Injectable()
export class SessionsInternalOperations {
  constructor(
    private readonly revoke: RevokeSessions,
    private readonly users: UsersFacade,
  ) {}

  @InternalHandler(RevokeUserSessionsOperation)
  async revokeUserSessions(
    input: RevokeUserSessionsInput,
  ): Promise<HandlerResult<RevokedSessions>> {
    const ref = await this.users.refOf(input.userId);
    if (ref === undefined) {
      throw new IdentityError(IdentityErrorCode.UserNotFound);
    }
    const revoked = await this.revoke.execute({
      user: ref,
      reason: input.reason,
    });
    return { outcome: CallOutcome.success({ revoked }) };
  }
}
