import { Injectable } from '@nestjs/common';
import {
  AuthMethodReference,
  IdentityErrorCode,
  IdentityRoute,
  MfaFactor,
  UserStatus,
  type PasskeyMfaVerifyRequest,
  type PasskeyOptions,
  type PasskeySignInVerifyRequest,
  type PasskeyStepUpVerifyRequest,
  type SignInResponse,
  type StepUpResult,
} from '@contracts/identity';
import { Clock } from '@platform/kernel';
import { DeploymentRegion } from '../../../shared/utils/deployment-region.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { SignInResponses } from '../../../shared/utils/sign-in-responses.js';
import type { ClientInfo } from '../../../shared/types/client-info.type.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { DevicesFacade, type DeviceProof } from '../../devices/index.js';
import { MfaFacade } from '../../mfa/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UsersFacade } from '../../users/index.js';
import { PasskeyDirectory } from '../domain/passkey-store.js';
import { WebAuthnPurpose } from '../domain/webauthn-challenge.js';
import { WebAuthnVerifier } from '../domain/webauthn-verifier.js';
import { PasskeyCeremony } from './passkey-ceremony.js';

/**
 * Passkeys as a way in: passwordless sign-in, second factor of a pending sign-in and step-up. A passkey with
 * user verification, from a device that proves it holds its key, satisfies both factors; otherwise it asks
 * for a second factor other than a passkey. As a second factor or in a step-up the passkey must verify the
 * user.
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
    private readonly deployment: DeploymentRegion,
    private readonly clock: Clock,
  ) {}

  /**
   * Starts a passwordless sign-in ceremony.
   * @returns The WebAuthn options and the challenge that identifies them.
   */
  signInOptions(): Promise<PasskeyOptions> {
    return this.ceremony.begin(WebAuthnPurpose.SignIn, undefined, (challenge) =>
      this.webauthn.authenticationOptions({ challenge, allow: [] }),
    );
  }

  /**
   * Signs in with a passkey.
   * @param request Challenge, WebAuthn response and, optionally, the device proof.
   * @param client Client that sends the request.
   * @returns The open session, or the pending second factor.
   * @throws IdentityError `IDENTITY.PASSKEY.VERIFICATION_FAILED` if the passkey does not verify.
   * @throws IdentityError `IDENTITY.USER.SUSPENDED` or `IDENTITY.AUTH.EMAIL_NOT_VERIFIED` for those accounts.
   */
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
    const recognition = await this.devices.recognize(
      user,
      PasskeyAuthentication.proofOf(request),
    );
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
    return SignInResponses.authenticated(session, this.deployment.location());
  }

  /**
   * Starts the passkey ceremony for the second factor of a pending sign-in.
   * @param mfaToken Token of the pending sign-in.
   * @returns The WebAuthn options restricted to the user's passkeys.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID` if the pending sign-in does not exist.
   * @throws IdentityError `IDENTITY.MFA.METHOD_UNAVAILABLE` if a passkey was not offered.
   */
  async mfaOptions(mfaToken: string): Promise<PasskeyOptions> {
    return this.optionsFor(
      await this.pendingOf(mfaToken, PendingPurpose.SignIn),
      WebAuthnPurpose.Mfa,
    );
  }

  /**
   * Completes a pending sign-in with a user-verified passkey as its second factor.
   * @param request Pending token, challenge, WebAuthn response and an optional new device key.
   * @returns The open session.
   * @throws IdentityError `IDENTITY.MFA.METHOD_UNAVAILABLE` if a passkey was not offered.
   * @throws IdentityError `IDENTITY.PASSKEY.VERIFICATION_FAILED` if it does not verify or skips user verification.
   */
  async mfaVerify(request: PasskeyMfaVerifyRequest): Promise<SignInResponse> {
    await this.verifyPending(
      await this.pendingOf(request.mfaToken, PendingPurpose.SignIn),
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

  /**
   * Starts the passkey ceremony for the step-up of an open session.
   * @param mfaToken Token of the pending step-up.
   * @param sessionId Session that asks for the step-up.
   * @returns The WebAuthn options restricted to the user's passkeys.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID` if the step-up is not of that session.
   */
  async stepUpOptions(
    mfaToken: string,
    sessionId: string,
  ): Promise<PasskeyOptions> {
    return this.optionsFor(
      await this.stepUpOf(mfaToken, sessionId),
      WebAuthnPurpose.StepUp,
    );
  }

  /**
   * Completes the step-up of an open session with a user-verified passkey.
   * @param request Pending token, challenge and WebAuthn response.
   * @param sessionId Session that asks for the step-up.
   * @returns The new access token and the session's last MFA.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID` if the step-up is not of that session.
   * @throws IdentityError `IDENTITY.PASSKEY.VERIFICATION_FAILED` if it does not verify or skips user verification.
   */
  async stepUpVerify(
    request: PasskeyStepUpVerifyRequest,
    sessionId: string,
  ): Promise<StepUpResult> {
    await this.verifyPending(
      await this.stepUpOf(request.mfaToken, sessionId),
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
    pending: PendingAuthentication,
    purpose: WebAuthnPurpose,
  ): Promise<PasskeyOptions> {
    PasskeyAuthentication.assertOffered(pending);
    const passkeys = await this.ceremony.userPasskeys(pending.user);
    if (passkeys.length === 0) {
      throw new IdentityError(IdentityErrorCode.MfaMethodUnavailable);
    }
    return this.ceremony.begin(purpose, pending.user, (challenge) =>
      this.webauthn.authenticationOptions({ challenge, allow: passkeys }),
    );
  }

  private async verifyPending(
    pending: PendingAuthentication,
    purpose: WebAuthnPurpose,
    challengeId: string,
    credentialJson: string,
  ): Promise<void> {
    PasskeyAuthentication.assertOffered(pending);
    const challenge = await this.ceremony.take(challengeId, purpose);
    if (challenge.userId !== pending.user.userId) {
      throw PasskeyCeremony.failed();
    }
    const userVerified = await this.ceremony.assert(
      pending.user,
      this.ceremony.credential(credentialJson),
      challenge.challenge,
    );
    if (!userVerified) {
      throw PasskeyCeremony.failed();
    }
  }

  private async stepUpOf(
    mfaToken: string,
    sessionId: string,
  ): Promise<PendingAuthentication> {
    const pending = await this.pendingOf(mfaToken, PendingPurpose.StepUp);
    if (pending.sessionId !== sessionId) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    return pending;
  }

  private async pendingOf(
    mfaToken: string,
    purpose: PendingPurpose,
  ): Promise<PendingAuthentication> {
    const pending = await this.mfa.pending(mfaToken, purpose);
    if (pending === undefined) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    return pending;
  }

  private async assertCanSignIn(user: UserRef): Promise<void> {
    const snapshot = await this.users.getByRef(user);
    if (snapshot.status === UserStatus.Deleted) {
      throw PasskeyCeremony.failed();
    }
    if (snapshot.status === UserStatus.Suspended) {
      throw new IdentityError(IdentityErrorCode.UserSuspended);
    }
    if (snapshot.status === UserStatus.PendingVerification) {
      throw new IdentityError(IdentityErrorCode.AuthEmailNotVerified);
    }
  }

  private static assertOffered(pending: PendingAuthentication): void {
    if (!pending.offeredFactors.includes(MfaFactor.Passkey)) {
      throw new IdentityError(IdentityErrorCode.MfaMethodUnavailable);
    }
  }

  private static proofOf(
    request: PasskeySignInVerifyRequest,
  ): DeviceProof | undefined {
    return request.device === undefined
      ? undefined
      : {
          action: IdentityRoute.PasskeySignInVerify,
          signature: request.device,
          bound: [request.challengeId],
        };
  }
}
