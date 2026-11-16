import { ClaimState, type ClaimResult } from '@platform/kernel';

type Acquired<T> = Extract<ClaimResult<T>, { state: ClaimState.Acquired }>;

/** Exige que un claim se haya adquirido y devuelve su forma con token. */
export class AcquiredClaim {
  /** @throws Error si el claim no quedó `acquired`. */
  static of<T>(result: ClaimResult<T>): Acquired<T> {
    expect(result.state).toBe(ClaimState.Acquired);
    return result as Acquired<T>;
  }
}
