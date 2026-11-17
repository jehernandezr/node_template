import type { WebAuthnChallenge } from './webauthn-challenge.js';

/** Desafíos de WebAuthn de un solo uso. */
export abstract class WebAuthnChallengeStore {
  abstract save(challenge: WebAuthnChallenge): Promise<void>;
  abstract consume(challengeId: string): Promise<WebAuthnChallenge | undefined>;
}
