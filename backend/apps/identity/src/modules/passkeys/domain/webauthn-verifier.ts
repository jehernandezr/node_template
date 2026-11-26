import type { Passkey } from './passkey.js';

/** New credential verified when registering a passkey. */
export interface VerifiedRegistration {
  readonly credentialId: string;
  readonly publicKey: string;
  readonly signCount: number;
  readonly transports: readonly string[];
  readonly aaguid: string;
  readonly backedUp: boolean;
}

/** Assertion verified when using a passkey. */
export interface VerifiedAssertion {
  readonly newSignCount: number;
  readonly userVerified: boolean;
}

/** WebAuthn: options for the browser and verification of its responses. */
export abstract class WebAuthnVerifier {
  /**
   * Builds the WebAuthn options the browser needs to create a passkey.
   * @param input Challenge, user and passkeys to exclude.
   * @returns The options for the browser.
   */
  abstract registrationOptions(input: {
    challenge: string;
    userId: string;
    userName: string;
    exclude: readonly Passkey[];
  }): Promise<unknown>;

  /**
   * Builds the WebAuthn options the browser needs to sign with a passkey.
   * @param input Challenge and allowed passkeys.
   * @returns The options for the browser.
   */
  abstract authenticationOptions(input: {
    challenge: string;
    allow: readonly Passkey[];
  }): Promise<unknown>;

  /**
   * `undefined` if the response does not verify.
   * @param response Authenticator response.
   * @param challenge Expected challenge.
   * @returns The verified registration, or `undefined`.
   */
  abstract verifyRegistration(
    response: unknown,
    challenge: string,
  ): Promise<VerifiedRegistration | undefined>;

  /**
   * `undefined` if the assertion does not verify or the signature counter went backwards.
   * @param response Authenticator response.
   * @param challenge Expected challenge.
   * @param passkey Stored passkey.
   * @returns The verified assertion, or `undefined`.
   */
  abstract verifyAuthentication(
    response: unknown,
    challenge: string,
    passkey: Passkey,
  ): Promise<VerifiedAssertion | undefined>;

  /**
   * The credential id of an assertion response, without verifying it.
   * @param response Authenticator response.
   * @returns The credential id, or `undefined`.
   */
  abstract credentialIdOf(response: unknown): string | undefined;
}
