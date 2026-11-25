import { Injectable } from '@nestjs/common';
import {
  AuthMethodReference,
  RevocationReason,
  SessionRevokedPayload,
  SessionTokens,
  TokensRevokedPayload,
} from '@contracts/identity';
import { UserRef } from '../../../shared/types/user-ref.type.js';
import { CreateSessionInput } from '../domain/create-session-input.js';
import { IssuedSession } from '../domain/issued-session.js';
import { SessionRef } from '../domain/session-ref.js';
import { CreateSession } from './create-session.use-case.js';
import { FindSession } from './find-session.use-case.js';
import { MarkMfaVerified } from './mark-mfa-verified.use-case.js';
import { RevocationReplay } from './revocation-replay.js';
import { RevokeSessions } from './revoke-sessions.use-case.js';
import { SessionsFacade } from './sessions.facade.js';

/** `SessionsFacade` inside the process. */
@Injectable()
export class LocalSessionsFacade extends SessionsFacade {
  constructor(
    private readonly create: CreateSession,
    private readonly revoke: RevokeSessions,
    private readonly mfa: MarkMfaVerified,
    private readonly find: FindSession,
    private readonly replay: RevocationReplay,
  ) {
    super();
  }

  /** {@inheritDoc SessionsFacade.createSession} */
  createSession(input: CreateSessionInput): Promise<IssuedSession> {
    return this.create.execute(input);
  }

  /** {@inheritDoc SessionsFacade.revokeUserSessions} */
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

  /** {@inheritDoc SessionsFacade.revokeDeviceSessions} */
  revokeDeviceSessions(
    ref: UserRef,
    deviceId: string,
    reason: RevocationReason,
  ): Promise<number> {
    return this.revoke.execute({ user: ref, reason, deviceId });
  }

  /** {@inheritDoc SessionsFacade.mfaVerifiedAt} */
  async mfaVerifiedAt(session: SessionRef): Promise<Date | undefined> {
    return (await this.find.execute(session))?.mfaVerifiedAt;
  }

  /** {@inheritDoc SessionsFacade.markMfaVerified} */
  markMfaVerified(
    session: SessionRef,
    at: Date,
    amr: readonly AuthMethodReference[],
  ): Promise<SessionTokens> {
    return this.mfa.execute(session, at, amr);
  }

  /** {@inheritDoc SessionsFacade.forget} */
  async forget(ref: UserRef): Promise<void> {
    await this.revoke.forget(ref);
  }

  /** {@inheritDoc SessionsFacade.replaySessionRevocation} */
  replaySessionRevocation(event: SessionRevokedPayload): Promise<void> {
    return this.replay.session(event);
  }

  /** {@inheritDoc SessionsFacade.replayUserRevocation} */
  replayUserRevocation(event: TokensRevokedPayload): Promise<void> {
    return this.replay.user(event);
  }
}
