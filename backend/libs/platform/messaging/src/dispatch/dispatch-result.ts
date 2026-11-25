import type { DispatchOutcome } from './dispatch-outcome.enum.js';

/** Result of {@link MessageDispatcher.dispatch}. */
export type DispatchResult =
  | { readonly outcome: DispatchOutcome.Processed; readonly id: string }
  | { readonly outcome: DispatchOutcome.Duplicate; readonly id: string }
  | {
      readonly outcome: DispatchOutcome.Ignored;
      readonly id: string;
      readonly type: string;
    }
  | {
      readonly outcome: DispatchOutcome.RetryLater;
      readonly id: string;
      readonly delayMs: number;
      readonly error: string;
      /** Stable error code, when it has one. */
      readonly code?: string;
    }
  | {
      readonly outcome: DispatchOutcome.InProgress;
      readonly id: string;
      /** What remains of the current lease; a reasonable wait for redelivery. */
      readonly delayMs: number;
    }
  | {
      readonly outcome: DispatchOutcome.DeadLetter;
      readonly id?: string;
      readonly error: string;
      /** Stable error code, when it has one. */
      readonly code?: string;
    };
