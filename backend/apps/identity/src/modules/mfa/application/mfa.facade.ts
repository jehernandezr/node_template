import type {
  AuthMethodReference,
  PendingMfa,
  SignInResponse,
  StepUpResult,
} from '@contracts/identity';
import type { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { StartPendingInput } from '../domain/start-pending-input.js';

/** Starts and completes the second factor challenges of sign-in and step-up for the other modules. */
export abstract class MfaFacade {
  /**
   * Stores the pending authentication.
   * @param input User, purpose, client and methods already satisfied.
   * @returns The `mfaToken` with the offered methods.
   */
  abstract startPending(input: StartPendingInput): Promise<PendingMfa>;

  /**
   * "It was not me" from the verifier device: the challenge stops accepting its code.
   * @param challengeId Denied challenge.
   */
  abstract denyChallenge(challengeId: string): Promise<void>;

  /**
   * Reads the pending authentication of that `mfaToken` and purpose.
   * @param mfaToken Pending token.
   * @param purpose Expected purpose.
   * @returns The pending authentication, or `undefined` if it expired or does not exist.
   */
  abstract pending(
    mfaToken: string,
    purpose: PendingPurpose,
  ): Promise<PendingAuthentication | undefined>;

  /**
   * Completes a pending sign-in with a second factor verified outside `mfa` (a passkey) and opens the
   * session.
   * @param mfaToken Pending token.
   * @param methods Methods just verified.
   * @param devicePublicKey Key of a new device to register, if any.
   * @returns The open session.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID` if the token was already used.
   */
  abstract completeSignIn(
    mfaToken: string,
    methods: readonly AuthMethodReference[],
    devicePublicKey?: string,
  ): Promise<SignInResponse>;

  /**
   * Completes a pending step-up with a second factor verified outside `mfa`.
   * @param mfaToken Pending token.
   * @param method Method just verified.
   * @returns The new access token and the last MFA.
   */
  abstract completeStepUp(
    mfaToken: string,
    method: AuthMethodReference,
  ): Promise<StepUpResult>;

  /**
   * Deletes the TOTP factor, recovery codes and recoveries of a user whose account is being erased.
   * @param ref User.
   */
  abstract forget(ref: UserRef): Promise<void>;

  /**
   * Replaces every factor of the user with a confirmed TOTP built from a known secret, for an account that a
   * deployment provisions and signs in with. Its recovery codes and pending recoveries are removed.
   * @param ref User.
   * @param secret Raw TOTP secret.
   */
  abstract replaceTotp(ref: UserRef, secret: Uint8Array): Promise<void>;
}
