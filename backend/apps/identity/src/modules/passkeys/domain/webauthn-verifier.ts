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
  abstract registrationOptions(input: {
    challenge: string;
    userId: string;
    userName: string;
    exclude: readonly Passkey[];
  }): Promise<unknown>;

  abstract authenticationOptions(input: {
    challenge: string;
    allow: readonly Passkey[];
  }): Promise<unknown>;

  /** `undefined` if the response does not verify. */
  abstract verifyRegistration(
    response: unknown,
    challenge: string,
  ): Promise<VerifiedRegistration | undefined>;

  /** `undefined` if the assertion does not verify or the signature counter went backwards. */
  abstract verifyAuthentication(
    response: unknown,
    challenge: string,
    passkey: Passkey,
  ): Promise<VerifiedAssertion | undefined>;

  /** The credential id of an assertion response, without verifying it. */
  abstract credentialIdOf(response: unknown): string | undefined;
}
