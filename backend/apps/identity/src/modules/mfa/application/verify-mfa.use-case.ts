import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  AuthMethodReference,
  IdentityErrorCode,
  type MfaVerifyRequest,
  type SignInResponse,
} from '@contracts/identity';
import { Clock } from '@platform/kernel';
import { DeploymentRegion } from '../../../shared/utils/deployment-region.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import {
  deviceNameFrom,
  platformFromUserAgent,
} from '../../../shared/utils/client-platform.js';
import { SignInResponses } from '../../../shared/utils/sign-in-responses.js';
import { DevicesFacade } from '../../devices/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import { ChallengeVerifier } from './challenge-verifier.js';

/**
 * Verifies the second factor of a sign-in and opens the session. With `devicePublicKey` it registers the
 * device (the verifier if it is the first) and binds the session to it. Proving a second factor cancels any
 * pending recovery without a device: the user still holds a factor.
 */
@Injectable()
export class VerifyMfa {
  constructor(
    private readonly pendings: PendingAuthenticationStore,
    private readonly verifier: ChallengeVerifier,
    private readonly devices: DevicesFacade,
    private readonly sessions: SessionsFacade,
    private readonly factors: MfaFactorRepository,
    private readonly scopes: ShardScopes,
    private readonly deployment: DeploymentRegion,
    private readonly clock: Clock,
  ) {}

  /**
   * Verifies the code of a challenge of a pending sign-in and opens the session.
   * @param request Pending token, challenge, code and an optional new device key.
   * @returns The open session.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID`, `IDENTITY.MFA.CODE_INVALID`, `IDENTITY.MFA.CODE_EXPIRED`
   *   or `IDENTITY.MFA.TOO_MANY_ATTEMPTS`.
   */
  async execute(request: MfaVerifyRequest): Promise<SignInResponse> {
    const pending = await this.pendings.find(request.mfaToken);
    if (pending === undefined || pending.purpose !== PendingPurpose.SignIn) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    const method = await this.verifier.verify(
      pending,
      request.challengeId,
      request.code,
    );
    return this.complete(request.mfaToken, [method], request.devicePublicKey);
  }

  /**
   * Consumes the pending sign-in and opens its session with the methods already verified.
   * @param mfaToken Token of the pending sign-in.
   * @param methods Second-factor methods just verified.
   * @param devicePublicKey Key of a new device to register, if any.
   * @returns The open session.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID` if the token was already used.
   */
  async complete(
    mfaToken: string,
    methods: readonly AuthMethodReference[],
    devicePublicKey?: string,
  ): Promise<SignInResponse> {
    const pending = await this.pendings.consume(mfaToken);
    if (pending === undefined || pending.purpose !== PendingPurpose.SignIn) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    await this.scopes.inUserShard(pending.user, () =>
      this.factors.cancelPendingRecoveries(pending.user.userId),
    );
    return this.open(pending, methods, devicePublicKey);
  }

  /**
   * Opens the session of a completed pending authentication. Passkeys and the recovery use it too.
   * @param pending Completed pending authentication.
   * @param methods Second-factor methods just verified.
   * @param devicePublicKey Key of a new device to register, if any.
   * @returns The open session.
   */
  async open(
    pending: PendingAuthentication,
    methods: readonly AuthMethodReference[],
    devicePublicKey?: string,
  ): Promise<SignInResponse> {
    const deviceId =
      devicePublicKey === undefined
        ? pending.deviceId
        : (
            await this.devices.register(pending.user, {
              publicKey: devicePublicKey,
              platform: platformFromUserAgent(pending.client.userAgent),
              name: deviceNameFrom(pending.client.userAgent),
              ip: pending.client.ip,
            })
          ).id;
    const now = this.clock.now();
    const session = await this.sessions.createSession({
      user: pending.user,
      ...(deviceId === undefined ? {} : { deviceId }),
      authMethods: [...pending.authMethods, ...methods],
      authTime: now,
      mfaVerifiedAt: now,
      client: pending.client,
    });
    return SignInResponses.authenticated(session, this.deployment.location());
  }
}
