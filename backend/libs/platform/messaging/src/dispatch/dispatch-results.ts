import { DispatchOutcome } from './dispatch-outcome.enum.js';
import type { DispatchResult } from './dispatch-result.js';

/** Reglas sobre el resultado de una entrega. */
export class DispatchResults {
  /**
   * Si el transporte debe dejar la entrega para reentrega en vez de
   * confirmarla (SQS: reportarla como fallo del ítem del lote).
   */
  static requiresRedelivery(result: DispatchResult): boolean {
    return (
      result.outcome === DispatchOutcome.RetryLater ||
      result.outcome === DispatchOutcome.InProgress
    );
  }
}
