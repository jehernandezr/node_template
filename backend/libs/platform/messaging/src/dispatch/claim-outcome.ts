import type { DispatchResult } from './dispatch-result.js';

/** How the attempt to take a message ended. */
export enum ClaimOutcomeKind {
  /** The claim is ours: the handler must run. */
  Acquired = 'acquired',
  /** The claim decided the result without running the handler. */
  Settled = 'settled',
}

/** Current claim of a message, with what is needed to complete or release it. */
export interface AcquiredMessageClaim {
  readonly key: string;
  readonly token: string;
}

/** Result of `ClaimGuard.claim`. */
export type ClaimOutcome =
  | {
      readonly kind: ClaimOutcomeKind.Acquired;
      readonly claim: AcquiredMessageClaim;
    }
  | {
      readonly kind: ClaimOutcomeKind.Settled;
      readonly result: DispatchResult;
    };
