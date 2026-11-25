import type { WebAuthnChallenge } from './webauthn-challenge.js';

/** Single-use WebAuthn challenges. */
export abstract class WebAuthnChallengeStore {
  abstract save(challenge: WebAuthnChallenge): Promise<void>;
  abstract consume(challengeId: string): Promise<WebAuthnChallenge | undefined>;
}
