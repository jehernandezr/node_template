import type { OperationDefinition } from '@contracts/platform';
import type { ForwardEntry } from './forward-entry.js';

/** Configuration of a step while the flow is being built. */
export interface StepDraft<TState> {
  readonly operation: OperationDefinition;
  input?: (state: TState) => unknown;
  onSuccess?: (state: TState, output: unknown) => void;
  compensationInput?: (state: TState, forward: ForwardEntry) => unknown;
  progressReasons?: readonly string[];
}
