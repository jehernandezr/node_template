import { Injectable } from '@nestjs/common';
import {
  AuthMethodReference,
  IdentityErrorCode,
  UserStatus,
  type PasskeyMfaVerifyRequest,
  type PasskeyOptions,
  type PasskeySignInVerifyRequest,
  type PasskeyStepUpVerifyRequest,
  type SignInResponse,
  type StepUpResult,
} from '@contracts/identity';
import { Clock } from '@platform/kernel';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { SignInResponses } from '../../../shared/utils/sign-in-responses.js';
import type { ClientInfo } from '../../../shared/types/client-info.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { DevicesFacade } from '../../devices/index.js';
import { MfaFacade } from '../../mfa/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UsersFacade } from '../../users/index.js';
import { PasskeyDirectory } from '../domain/passkey-store.js';
import { WebAuthnPurpose } from '../domain/webauthn-challenge.js';
import { WebAuthnVerifier } from '../domain/webauthn-verifier.js';
import { PasskeyCeremony } from './passkey-ceremony.js';

/**
 * Las passkeys como forma de entrar: inicio de sesión sin contraseña, segundo factor de un inicio de sesión
 * pendiente y step-up. Una passkey con verificación del usuario desde un dispositivo registrado cumple los
 * dos factores; si no, pide un segundo factor como una contraseña.
 */
@Injectable()
export class PasskeyAuthentication {
  constructor(
    private readonly ceremony: PasskeyCeremony,
    private readonly directory: PasskeyDirectory,
    private readonly webauthn: WebAuthnVerifier,
    private readonly users: UsersFacade,
    private readonly devices: DevicesFacade,
    private readonly mfa: MfaFacade,
    private readonly sessions: SessionsFacade,
    private readonly settings: IdentitySettings,
    private readonly clock: Clock,
  ) {}

  signInOptions(): Promise<PasskeyOptions> {
    return this.ceremony.begin(WebAuthnPurpose.SignIn, undefined, (challenge) =>
      this.webauthn.authenticationOptions({ challenge, allow: [] }),
    );
  }

  async signIn(
    request: PasskeySignInVerifyRequest,
    client: ClientInfo,
  ): Promise<SignInResponse> {
    const challenge = await this.ceremony.take(
      request.challengeId,
      WebAuthnPurpose.SignIn,
    );
    const credential = this.ceremony.credential(request.credentialJson);
    const user = await this.directory.ownerOf(
      this.ceremony.credentialIdOf(credential),
    );
    if (user === undefined) {
      throw PasskeyCeremony.failed();
    }
    const userVerified = await this.ceremony.assert(
      user,
      credential,
      challenge.challenge,
    );
    await this.assertCanSignIn(user);
    const recognition = await this.devices.recognize(user, request.deviceId);
    const deviceId = recognition.device?.id;
    if (!userVerified || !recognition.recognized) {
      return SignInResponses.mfaRequired(
        await this.mfa.startPending({
          user,
          purpose: PendingPurpose.SignIn,
          client,
          ...(deviceId === undefined ? {} : { deviceId }),
          authMethods: [AuthMethodReference.Passkey],
        }),
      );
    }
    const now = this.clock.now();
    const session = await this.sessions.createSession({
      user,
      ...(deviceId === undefined ? {} : { deviceId }),
      authMethods: [AuthMethodReference.Passkey, AuthMethodReference.Device],
      authTime: now,
      mfaVerifiedAt: now,
      client,
    });
    return SignInResponses.authenticated(
      session,
      this.settings.values.IDENTITY_REGION,
    );
  }

  async mfaOptions(mfaToken: string): Promise<PasskeyOptions> {
    return this.optionsFor(
      mfaToken,
      PendingPurpose.SignIn,
      WebAuthnPurpose.Mfa,
    );
  }

  async mfaVerify(request: PasskeyMfaVerifyRequest): Promise<SignInResponse> {
    await this.verifyPending(
      request.mfaToken,
      PendingPurpose.SignIn,
      WebAuthnPurpose.Mfa,
      request.challengeId,
      request.credentialJson,
    );
    return this.mfa.completeSignIn(
      request.mfaToken,
      [AuthMethodReference.Passkey],
      request.devicePublicKey,
    );
  }

  async stepUpOptions(mfaToken: string): Promise<PasskeyOptions> {
    return this.optionsFor(
      mfaToken,
      PendingPurpose.StepUp,
      WebAuthnPurpose.StepUp,
    );
  }

  async stepUpVerify(
    request: PasskeyStepUpVerifyRequest,
  ): Promise<StepUpResult> {
    await this.verifyPending(
      request.mfaToken,
      PendingPurpose.StepUp,
      WebAuthnPurpose.StepUp,
      request.challengeId,
      request.credentialJson,
    );
    return this.mfa.completeStepUp(
      request.mfaToken,
      AuthMethodReference.Passkey,
    );
  }

  private async optionsFor(
    mfaToken: string,
    pendingPurpose: PendingPurpose,
    purpose: WebAuthnPurpose,
  ): Promise<PasskeyOptions> {
    const user = await this.pendingUser(mfaToken, pendingPurpose);
    const passkeys = await this.ceremony.userPasskeys(user);
    if (passkeys.length === 0) {
      throw new IdentityError(IdentityErrorCode.MfaMethodUnavailable);
    }
    return this.ceremony.begin(purpose, user, (challenge) =>
      this.webauthn.authenticationOptions({ challenge, allow: passkeys }),
    );
  }

  private async verifyPending(
    mfaToken: string,
    pendingPurpose: PendingPurpose,
    purpose: WebAuthnPurpose,
    challengeId: string,
    credentialJson: string,
  ): Promise<void> {
    const user = await this.pendingUser(mfaToken, pendingPurpose);
    const challenge = await this.ceremony.take(challengeId, purpose);
    if (challenge.userId !== user.userId) {
      throw PasskeyCeremony.failed();
    }
    await this.ceremony.assert(
      user,
      this.ceremony.credential(credentialJson),
      challenge.challenge,
    );
  }

  private async pendingUser(
    mfaToken: string,
    purpose: PendingPurpose,
  ): Promise<UserRef> {
    const pending = await this.mfa.pending(mfaToken, purpose);
    if (pending === undefined) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    return pending.user;
  }

  private async assertCanSignIn(user: UserRef): Promise<void> {
    const snapshot = await this.users.getByRef(user);
    if (snapshot.status === UserStatus.Suspended) {
      throw new IdentityError(IdentityErrorCode.UserSuspended);
    }
    if (snapshot.status === UserStatus.PendingVerification) {
      throw new IdentityError(IdentityErrorCode.AuthEmailNotVerified);
    }
  }
}
