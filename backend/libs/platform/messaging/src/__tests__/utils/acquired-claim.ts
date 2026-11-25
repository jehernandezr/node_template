import { ClaimState, type ClaimResult } from '@platform/kernel';

type Acquired<T> = Extract<ClaimResult<T>, { state: ClaimState.Acquired }>;

/** Requires that a claim was acquired and returns its shape with a token. */
export class AcquiredClaim {
  /** @throws Error if the claim did not end up `acquired`. */
  static of<T>(result: ClaimResult<T>): Acquired<T> {
    expect(result.state).toBe(ClaimState.Acquired);
    return result as Acquired<T>;
  }
}
