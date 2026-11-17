import { Injectable } from '@nestjs/common';
import {
  AuthMethodReference,
  RevocationReason,
  SessionTokens,
} from '@contracts/identity';
import { UserRef } from '../../../shared/types/user-ref.type.js';
import { CreateSessionInput } from '../domain/create-session-input.js';
import { IssuedSession } from '../domain/issued-session.js';
import { SessionRef } from '../domain/session-ref.js';
import { CreateSession } from './create-session.use-case.js';
import { FindSession } from './find-session.use-case.js';
import { MarkMfaVerified } from './mark-mfa-verified.use-case.js';
import { RevokeSessions } from './revoke-sessions.use-case.js';
import { SessionsFacade } from './sessions.facade.js';

/** `SessionsFacade` dentro del proceso. */
@Injectable()
export class LocalSessionsFacade extends SessionsFacade {
  constructor(
    private readonly create: CreateSession,
    private readonly revoke: RevokeSessions,
    private readonly mfa: MarkMfaVerified,
    private readonly find: FindSession,
  ) {
    super();
  }

  createSession(input: CreateSessionInput): Promise<IssuedSession> {
    return this.create.execute(input);
  }

  revokeUserSessions(
    ref: UserRef,
    reason: RevocationReason,
    options?: { except?: string },
  ): Promise<number> {
    return this.revoke.execute({
      user: ref,
      reason,
      ...(options?.except === undefined ? {} : { except: options.except }),
    });
  }

  revokeDeviceSessions(
    ref: UserRef,
    deviceId: string,
    reason: RevocationReason,
  ): Promise<number> {
    return this.revoke.execute({ user: ref, reason, deviceId });
  }

  async mfaVerifiedAt(session: SessionRef): Promise<Date | undefined> {
    return (await this.find.execute(session))?.mfaVerifiedAt;
  }

  markMfaVerified(
    session: SessionRef,
    at: Date,
    amr: readonly AuthMethodReference[],
  ): Promise<SessionTokens> {
    return this.mfa.execute(session, at, amr);
  }
}
