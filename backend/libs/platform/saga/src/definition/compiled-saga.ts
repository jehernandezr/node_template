import type { CompiledStep } from './compiled-step.js';

/** Validated saga definition. */
export interface CompiledSaga<TState> {
  readonly type: string;
  readonly steps: readonly CompiledStep<TState>[];
  /** Index of the first step after the pivot, or `steps.length` if there is none. */
  readonly pivotIndex: number;
}
