import type { Page } from '@contracts/platform';
import type { DeviceSignatureFields } from './device.type.js';

/**
 * WebAuthn options in base64url. The client hands them as they are to the
 * system API, which is why they travel as text and not as an object.
 */
export interface PasskeyOptions {
  challengeId: string;
  optionsJson: string;
}

/**
 * Verification of a passkey sign-in. `device` is the proof that the request comes from a registered
 * device: its ES256 signature over `identity.auth.passkey-verify`, its public id, the timestamp, the
 * nonce and the challenge id.
 */
export interface PasskeySignInVerifyRequest {
  challengeId: string;
  credentialJson: string;
  device?: DeviceSignatureFields;
}

/** Passkey options for the second factor of a pending sign-in. */
export interface PasskeyMfaOptionsRequest {
  mfaToken: string;
}

/** Passkey verification as the second factor of a pending sign-in. */
export interface PasskeyMfaVerifyRequest {
  mfaToken: string;
  challengeId: string;
  credentialJson: string;
  devicePublicKey?: string;
}

/** Passkey options for the step-up of an open session. */
export interface PasskeyStepUpOptionsRequest {
  mfaToken: string;
}

/** Passkey verification for the step-up of an open session. */
export interface PasskeyStepUpVerifyRequest {
  mfaToken: string;
  challengeId: string;
  credentialJson: string;
}

/** Registered passkey. The private key never leaves the device. */
export interface PasskeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** True if the credential is backed up in the provider's cloud. */
  backedUp: boolean;
}

export type PasskeyPage = Page<PasskeySummary>;

/** Registration of a new passkey with the response signed by the authenticator. */
export interface RegisterPasskeyRequest {
  challengeId: string;
  credentialJson: string;
  name: string;
}

/** Passkey to remove. */
export interface RemovePasskeyRequest {
  passkeyId: string;
}
