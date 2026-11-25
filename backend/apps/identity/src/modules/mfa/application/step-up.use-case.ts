import { ActingUser } from '@platform/auth';
import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  type AuthMethodReference,
  type PendingMfa,
  type StepUpResult,
  type StepUpVerifyRequest,
} from '@contracts/identity';
import type { UserActor } from '@platform/auth';
import { Clock } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { ClientInfo } from '../../../shared/types/client-info.type.js';
import { SessionsFacade } from '../../sessions/index.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import { ChallengeVerifier } from './challenge-verifier.js';
import { StartPendingMfa } from './start-pending-mfa.use-case.js';

/**
 * Additional step of an open session for sensitive operations. Verifying it raises the session's last MFA
 * and issues a new access token; the session token does not change.
 */
@Injectable()
export class StepUp {
  constructor(
    private readonly start: StartPendingMfa,
    private readonly pendings: PendingAuthenticationStore,
    private readonly verifier: ChallengeVerifier,
    private readonly sessions: SessionsFacade,
    private readonly clock: Clock,
  ) {}

  begin(actor: UserActor, client: ClientInfo): Promise<PendingMfa> {
    return this.start.execute({
      user: ActingUser.refOf(actor),
      purpose: PendingPurpose.StepUp,
      client,
      sessionId: actor.sessionId,
      ...(actor.deviceId === undefined ? {} : { deviceId: actor.deviceId }),
      authMethods: actor.authMethods,
    });
  }

  async verify(
    actor: UserActor,
    request: StepUpVerifyRequest,
  ): Promise<StepUpResult> {
    const pending = await this.pendings.find(request.mfaToken);
    if (
      pending === undefined ||
      pending.purpose !== PendingPurpose.StepUp ||
      pending.sessionId !== actor.sessionId
    ) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    const method = await this.verifier.verify(
      pending,
      request.challengeId,
      request.code,
    );
    return this.complete(request.mfaToken, method);
  }

  /** Consumes the pending step-up and raises the last MFA of its session. */
  async complete(
    mfaToken: string,
    method: AuthMethodReference,
  ): Promise<StepUpResult> {
    const pending = await this.pendings.consume(mfaToken);
    if (
      pending?.sessionId === undefined ||
      pending.purpose !== PendingPurpose.StepUp
    ) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    const at = this.clock.now();
    const tokens = await this.sessions.markMfaVerified(
      {
        sessionId: pending.sessionId,
        userId: pending.user.userId,
        homeTenantId: pending.user.homeTenantId,
      },
      at,
      [method],
    );
    return { tokens, mfaVerifiedAt: at.toISOString() };
  }
}
