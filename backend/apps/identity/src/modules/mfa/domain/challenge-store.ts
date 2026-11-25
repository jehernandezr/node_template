import type { MfaChallengeRecord } from './mfa-challenge.js';

/**
 * MFA challenges with atomic attempts and single use: two replicas cannot count the same attempt twice
 * or accept the same code twice.
 */
export abstract class ChallengeStore {
  abstract save(challenge: MfaChallengeRecord): Promise<void>;
  abstract find(challengeId: string): Promise<MfaChallengeRecord | undefined>;
  /** Adds an attempt and returns how many there are. */
  abstract attempt(challengeId: string): Promise<number>;
  /** Consumes the challenge; returns `false` if it was already used or does not exist. */
  abstract consume(challengeId: string): Promise<boolean>;
  /** Adds a challenge requested by the pending authentication in its window and returns how many there are. */
  abstract countRequest(pendingId: string, windowMs: number): Promise<number>;
}
