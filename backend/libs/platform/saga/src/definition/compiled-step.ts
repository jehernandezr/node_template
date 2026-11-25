import type { OperationDefinition } from '@contracts/platform';
import type { ForwardEntry } from './forward-entry.js';

/** Validated step, ready for the engine to run. */
export interface CompiledStep<TState> {
  readonly index: number;
  readonly operationId: string;
  /**
   * Compensation operation; `null` for the steps after the pivot and
   * for read-only ones, which have nothing to undo and are skipped when compensating.
   */
  readonly compensationOperationId: string | null;
  readonly afterPivot: boolean;
  /** Contract of the operation. At startup, idempotency and time budgets are verified against it. */
  readonly definition: OperationDefinition;
  /** `transient-failure` reasons that are participant progress and do not spend suspensions. */
  readonly progressReasons: ReadonlySet<string>;
  input(state: TState): unknown;
  onSuccess(state: TState, output: unknown): void;
  compensationInput(state: TState, forward: ForwardEntry): unknown;
}
