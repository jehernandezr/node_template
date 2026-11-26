import { DispatchOutcome } from './dispatch-outcome.enum.js';
import type { DispatchResult } from './dispatch-result.js';

/** Rules about the result of a delivery. */
export class DispatchResults {
  /**
   * Whether the transport must leave the delivery for redelivery instead of
   * acknowledging it (SQS: report it as a failed item of the batch).
   * @param result Dispatch result.
   * @returns `true` when it must be redelivered.
   */
  static requiresRedelivery(result: DispatchResult): boolean {
    return (
      result.outcome === DispatchOutcome.RetryLater ||
      result.outcome === DispatchOutcome.InProgress
    );
  }
}
