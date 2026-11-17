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
import { userRefOf } from '../../../shared/utils/user-actor.js';
import { SessionsFacade } from '../../sessions/index.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import { ChallengeVerifier } from './challenge-verifier.js';
import { StartPendingMfa } from './start-pending-mfa.use-case.js';

/**
 * Paso adicional de una sesión abierta para las operaciones sensibles. Verificarlo sube el último MFA de
 * la sesión y emite un access token nuevo; el session token no cambia.
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
      user: userRefOf(actor),
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

  /** Consume el step-up pendiente y sube el último MFA de su sesión. */
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
