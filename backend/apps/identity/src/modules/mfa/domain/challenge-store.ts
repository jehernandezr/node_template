import type { MfaChallengeRecord } from './mfa-challenge.js';

/**
 * MFA challenges with atomic attempts and single use: two replicas cannot count the same attempt twice
 * or accept the same code twice.
 */
export abstract class ChallengeStore {
  /**
   * Stores a challenge.
   * @param challenge Challenge to store.
   */
  abstract save(challenge: MfaChallengeRecord): Promise<void>;
  /**
   * Reads a challenge.
   * @param challengeId Challenge to read.
   * @returns The challenge, or `undefined`.
   */
  abstract find(challengeId: string): Promise<MfaChallengeRecord | undefined>;
  /**
   * Adds an attempt and returns how many there are.
   * @param challengeId Challenge attempted.
   * @returns The attempts so far.
   */
  abstract attempt(challengeId: string): Promise<number>;
  /**
   * Consumes the challenge; returns `false` if it was already used or does not exist.
   * @param challengeId Challenge to consume.
   * @returns Whether it was consumed now.
   */
  abstract consume(challengeId: string): Promise<boolean>;
  /**
   * Adds a challenge requested by the pending authentication in its window and returns how many there are.
   * @param pendingId Pending authentication.
   * @param windowMs Length of the window.
   * @returns The challenges requested in the window.
   */
  abstract countRequest(pendingId: string, windowMs: number): Promise<number>;
}
