import type { OperationDefinition } from '@contracts/platform';
import type { ForwardEntry } from './forward-entry.js';

/** Configuración de un paso mientras se arma el flujo. */
export interface StepDraft<TState> {
  readonly operation: OperationDefinition;
  input?: (state: TState) => unknown;
  onSuccess?: (state: TState, output: unknown) => void;
  compensationInput?: (state: TState, forward: ForwardEntry) => unknown;
  progressReasons?: readonly string[];
}
