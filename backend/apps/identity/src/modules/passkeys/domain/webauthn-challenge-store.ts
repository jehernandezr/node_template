import type { WebAuthnChallenge } from './webauthn-challenge.js';

/** Single-use WebAuthn challenges. */
export abstract class WebAuthnChallengeStore {
  /**
   * Stores a challenge until it expires.
   * @param challenge Challenge to store.
   */
  abstract save(challenge: WebAuthnChallenge): Promise<void>;
  /**
   * Takes a challenge once.
   * @param challengeId Challenge to take.
   * @returns The challenge, or `undefined`.
   */
  abstract consume(challengeId: string): Promise<WebAuthnChallenge | undefined>;
}
