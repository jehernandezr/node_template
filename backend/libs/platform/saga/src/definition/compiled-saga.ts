import type { CompiledStep } from './compiled-step.js';

/** Definición de saga validada. */
export interface CompiledSaga<TState> {
  readonly type: string;
  readonly steps: readonly CompiledStep<TState>[];
  /** Índice del primer paso después del pivote, o `steps.length` si no hay. */
  readonly pivotIndex: number;
}
