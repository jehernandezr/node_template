import type { CallOutcome } from '@platform/primitives';
import type { CompiledStep } from '../definition/compiled-step.js';
import type { SagaInstance } from '../model/saga-instance.js';
import type { StepDirection } from '../model/step-direction.enum.js';
import type { StepLogEntry } from '../model/step-log-entry.js';

/** El intento de un paso que se va a despachar: qué paso, en qué dirección y contra qué operación. */
export interface StepTarget {
  readonly step: CompiledStep<unknown>;
  readonly direction: StepDirection;
  readonly operationId: string;
  /** Entrada de un intento previo en esta dirección, si hay. */
  readonly entry: StepLogEntry | undefined;
  /** Construye la entrada de un primer intento. Los reintentos reutilizan la guardada. */
  readonly buildInput: (state: unknown) => unknown;
}

/** Un intento despachado y lo que devolvió la llamada. */
export interface StepAttempt {
  /** Instancia tal como quedó escrita con el despacho. */
  readonly instance: SagaInstance;
  readonly dispatched: StepLogEntry;
  readonly outcome: CallOutcome<unknown>;
}

/** Qué pasó al intentar despachar y llamar un paso. */
export enum StepCallResult {
  /** Se despachó y la llamada devolvió un resultado: `attempt` lo lleva. */
  Called = 'called',
  /** No se pudo despachar (la entrada no se construyó): `instance` ya quedó escrita y detenida. */
  Halted = 'halted',
}

export type StepCall =
  | { readonly result: StepCallResult.Called; readonly attempt: StepAttempt }
  | { readonly result: StepCallResult.Halted; readonly instance: SagaInstance };
