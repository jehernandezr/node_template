import { ClaimState } from './claim-state.js';

export interface AcquiredClaim {
  readonly state: ClaimState.Acquired;
  /** Fencing token. `complete` and `release` only accept it while it is the current one. */
  readonly claimToken: string;
  /** Epoch milliseconds until which nobody else can take the key. */
  readonly leaseUntil: number;
  /** Hash stored with the first claim; it is compared with the one of this attempt. */
  readonly fingerprint: string;
  /** `true` if the key was taken because the previous lease expired. */
  readonly takeover: boolean;
}

export interface InProgressClaim {
  readonly state: ClaimState.InProgress;
  readonly leaseUntil: number;
  readonly fingerprint: string;
}

export interface CompletedClaim<R> {
  readonly state: ClaimState.Completed;
  readonly result: R;
  readonly fingerprint: string;
}

/** Result of `IdempotencyStore.claim`. */
export type ClaimResult<R> =
  AcquiredClaim | InProgressClaim | CompletedClaim<R>;
