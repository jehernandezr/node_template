import type { CallOutcome } from '@platform/primitives';
import type { CompiledStep } from '../definition/compiled-step.js';
import type { SagaInstance } from '../model/saga-instance.js';
import type { StepDirection } from '../model/step-direction.enum.js';
import type { StepLogEntry } from '../model/step-log-entry.js';

/** The attempt of a step about to be dispatched: which step, in which direction and against which operation. */
export interface StepTarget {
  readonly step: CompiledStep<unknown>;
  readonly direction: StepDirection;
  readonly operationId: string;
  /** Input of a previous attempt in this direction, if any. */
  readonly entry: StepLogEntry | undefined;
  /** Builds the input of a first attempt. Retries reuse the stored one. */
  readonly buildInput: (state: unknown) => unknown;
}

/** A dispatched attempt and what the call returned. */
export interface StepAttempt {
  /** Instance as it was written with the dispatch. */
  readonly instance: SagaInstance;
  readonly dispatched: StepLogEntry;
  readonly outcome: CallOutcome<unknown>;
}

/** What happened when trying to dispatch and call a step. */
export enum StepCallResult {
  /** It was dispatched and the call returned a result: `attempt` carries it. */
  Called = 'called',
  /** It could not be dispatched (the input was not built): `instance` was already written and stopped. */
  Halted = 'halted',
}

export type StepCall =
  | { readonly result: StepCallResult.Called; readonly attempt: StepAttempt }
  | { readonly result: StepCallResult.Halted; readonly instance: SagaInstance };
