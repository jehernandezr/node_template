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
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import { ChallengeVerifier } from './challenge-verifier.js';

/**
 * Verifica el segundo factor de un inicio de sesión y abre la sesión. Con `devicePublicKey` registra el
 * dispositivo (verificador si es el primero) y la sesión queda atada a él.
 */
@Injectable()
export class VerifyMfa {
  constructor(
    private readonly pendings: PendingAuthenticationStore,
    private readonly verifier: ChallengeVerifier,
    private readonly devices: DevicesFacade,
    private readonly sessions: SessionsFacade,
    private readonly deployment: DeploymentRegion,
    private readonly clock: Clock,
  ) {}

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

  /** Consume el inicio de sesión pendiente y abre su sesión con los métodos ya verificados. */
  async complete(
    mfaToken: string,
    methods: readonly AuthMethodReference[],
    devicePublicKey?: string,
  ): Promise<SignInResponse> {
    const pending = await this.pendings.consume(mfaToken);
    if (pending === undefined || pending.purpose !== PendingPurpose.SignIn) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    return this.open(pending, methods, devicePublicKey);
  }

  /** Abre la sesión de una autenticación pendiente ya completada. La usan también passkeys y la recuperación. */
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
