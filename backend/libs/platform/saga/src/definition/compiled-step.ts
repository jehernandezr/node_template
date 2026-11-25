import type { OperationDefinition } from '@contracts/platform';
import type { ForwardEntry } from './forward-entry.js';

/** Paso validado, listo para que el motor lo ejecute. */
export interface CompiledStep<TState> {
  readonly index: number;
  readonly operationId: string;
  /**
   * Operación de compensación; `null` para los pasos después del pivote y
   * para los de solo lectura, que no tienen nada que deshacer y se saltan al compensar.
   */
  readonly compensationOperationId: string | null;
  readonly afterPivot: boolean;
  /** Contrato de la operación. Al arrancar se verifican contra él la idempotencia y los presupuestos de tiempo. */
  readonly definition: OperationDefinition;
  /** Motivos de `transient-failure` que son avance del participante y no gastan suspensiones. */
  readonly progressReasons: ReadonlySet<string>;
  input(state: TState): unknown;
  onSuccess(state: TState, output: unknown): void;
  compensationInput(state: TState, forward: ForwardEntry): unknown;
}
