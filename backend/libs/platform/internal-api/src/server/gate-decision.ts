import type { CallOutcome } from '@platform/primitives';
import type { ClaimedOperation } from './claimed-operation.js';

/** Qué hace el router después de pedir el claim. */
export enum GateDecisionKind {
  /** La llave es de esta llamada: se corre el handler. */
  Proceed = 'proceed',
  /** Hay respuesta sin correr el handler: un resultado guardado o un rechazo. */
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
