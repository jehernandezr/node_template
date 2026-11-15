import type { DispatchOutcome } from './dispatch-outcome.enum.js';

/** Resultado de {@link MessageDispatcher.dispatch}. */
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
      /** Código estable del error, cuando lo tiene. */
      readonly code?: string;
    }
  | {
      readonly outcome: DispatchOutcome.InProgress;
      readonly id: string;
      /** Lo que le queda al lease vigente; una espera razonable para la reentrega. */
      readonly delayMs: number;
    }
  | {
      readonly outcome: DispatchOutcome.DeadLetter;
      readonly id?: string;
      readonly error: string;
      /** Código estable del error, cuando lo tiene. */
      readonly code?: string;
    };
