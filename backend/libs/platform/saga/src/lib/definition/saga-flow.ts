import { SagaError, SagaErrorCode } from '../errors.js';
import { StepStatus } from '../model.js';

/** Reference to an operation of another service, typed by its input and output. */
export interface OperationRef<TIn = unknown, TOut = unknown> {
  readonly id: string;
  /** Id of the operation that undoes this one, or null when it has none. */
  readonly compensatedBy: string | null;
  /** Phantom type marker; never set at runtime. */
  readonly __input?: TIn;
  /** Phantom type marker; never set at runtime. */
  readonly __output?: TOut;
}

/** Forward entry of a step, as seen by compensation input builders. */
export interface ForwardEntry {
  readonly input: unknown;
  readonly output: unknown;
  readonly idempotencyKey: string;
  readonly status: StepStatus;
}

/** A validated step, ready to be executed by the engine. */
export interface CompiledStep<TState> {
  readonly index: number;
  readonly operationId: string;
  /** Compensation operation; null for steps after the pivot. */
  readonly compensationOperationId: string | null;
  readonly afterPivot: boolean;
  input(state: TState): unknown;
  onSuccess(state: TState, output: unknown): void;
  compensationInput(state: TState, forward: ForwardEntry): unknown;
}

/** A validated saga definition. */
export interface CompiledSaga<TState> {
  readonly type: string;
  readonly steps: readonly CompiledStep<TState>[];
  /** Index of the first step after the pivot, or `steps.length` when there is none. */
  readonly pivotIndex: number;
}

/** Configuration of one step while the flow is being built. */
export interface StepDraft<TState> {
  readonly operation: OperationRef<unknown, unknown>;
  input?: (state: TState) => unknown;
  onSuccess?: (state: TState, output: unknown) => void;
  compensationInput?: (state: TState, forward: ForwardEntry) => unknown;
}

/**
 * Configures one step. Methods return the same object, so the chain can go on
 * with `.step()`, `.pivot()` or the next configuration call.
 */
export class StepConfig<TState, TIn, TOut> {
  constructor(
    private readonly flow: SagaFlow<TState>,
    private readonly draft: StepDraft<TState>,
  ) {}

  /** Builds the input of this step from the saga state. Defaults to `undefined`. */
  input(fn: (state: TState) => TIn): this {
    this.draft.input = fn;
    return this;
  }

  /** Applies the output of this step to the saga state. Receives a normalized copy. */
  onSuccess(fn: (state: TState, output: TOut) => void): this {
    // The engine passes the JSON-normalized output that the invoker produced.
    this.draft.onSuccess = fn as (state: TState, output: unknown) => void;
    return this;
  }

  /** Builds the compensation input. Defaults to the logged forward input. */
  compensationInput(
    fn: (state: TState, forward: ForwardEntry) => unknown,
  ): this {
    this.draft.compensationInput = fn;
    return this;
  }

  /** Adds the next step. */
  step<TNextIn, TNextOut>(
    operation: OperationRef<TNextIn, TNextOut>,
  ): StepConfig<TState, TNextIn, TNextOut> {
    return this.flow.step(operation);
  }

  /** Marks the boundary: steps added after this call are never compensated. */
  pivot(): this {
    this.flow.markPivot();
    return this;
  }
}

/**
 * Fluent builder used inside `SagaDefinition.define`. Steps declared before
 * `pivot()` are compensable; steps declared after it are not.
 */
export class SagaFlow<TState> {
  private readonly drafts: StepDraft<TState>[] = [];
  private pivotIndex: number | null = null;

  /** Adds a step that calls `operation`. */
  step<TIn, TOut>(
    operation: OperationRef<TIn, TOut>,
  ): StepConfig<TState, TIn, TOut> {
    const draft: StepDraft<TState> = { operation };
    this.drafts.push(draft);
    return new StepConfig<TState, TIn, TOut>(this, draft);
  }

  /**
   * Records the pivot boundary before the next step.
   * @internal Called by `StepConfig.pivot()`.
   */
  markPivot(): void {
    if (this.pivotIndex !== null) {
      throw new SagaError(
        SagaErrorCode.InvalidDefinition,
        'pivot() can be declared only once per saga',
      );
    }
    this.pivotIndex = this.drafts.length;
  }

  /**
   * Validates the flow and freezes it into a compiled saga.
   * @internal Called by `SagaDefinition.build()`.
   */
  compile(type: string): CompiledSaga<TState> {
    if (this.drafts.length === 0) {
      throw new SagaError(
        SagaErrorCode.InvalidDefinition,
        `Saga "${type}" declares no steps`,
      );
    }
    const pivotIndex = this.pivotIndex ?? this.drafts.length;
    const steps = this.drafts.map((draft, index): CompiledStep<TState> => {
      const afterPivot = index >= pivotIndex;
      const compensatedBy = draft.operation.compensatedBy;
      if (!afterPivot && compensatedBy === null) {
        throw new SagaError(
          SagaErrorCode.MissingCompensation,
          `Step ${index} (${draft.operation.id}) of saga "${type}" runs before the pivot and has no compensation`,
        );
      }
      return {
        index,
        operationId: draft.operation.id,
        compensationOperationId: afterPivot ? null : compensatedBy,
        afterPivot,
        input: draft.input ?? (() => undefined),
        onSuccess: draft.onSuccess ?? (() => undefined),
        compensationInput:
          draft.compensationInput ??
          ((_state: TState, forward: ForwardEntry) => forward.input),
      };
    });
    return { type, steps, pivotIndex };
  }
}
