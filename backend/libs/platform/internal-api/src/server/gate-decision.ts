import type { CallOutcome } from '@platform/primitives';
import type { ClaimedOperation } from './claimed-operation.js';

/** What the router does after requesting the claim. */
export enum GateDecisionKind {
  /** The key belongs to this call: the handler runs. */
  Proceed = 'proceed',
  /** There is a response without running the handler: a stored result or a rejection. */
  Respond = 'respond',
}

export type GateDecision =
  | {
      readonly kind: GateDecisionKind.Proceed;
      readonly claimed: ClaimedOperation;
    }
  | {
      readonly kind: GateDecisionKind.Respond;
      readonly outcome: CallOutcome<unknown>;
    };
