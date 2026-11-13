import { Compensation, type OperationDefinition } from '@contracts/platform';
import { compensationOf, resolveOperation } from '@platform/internal-api';
import type { z } from 'zod';
import { SagaError, SagaErrorCode } from '../errors.js';
import { StepStatus } from '../model.js';

/**
 * Reference to an operation written by hand, typed by its input and output.
 * @deprecated Pass the `OperationDefinition` of the contract (`defineOperation`
 * of `@contracts/platform`) to `step()`: the compensation and the types come
 * from it, so they cannot drift from the contract.
 */
export interface OperationRef<TIn = unknown, TOut = unknown> {
  readonly id: string;
  /** Id of the operation that undoes this one, or null (or `Compensation.None`) when it has none. */
  readonly compensatedBy: string | null;
  /** Phantom type marker; never set at runtime. */
  readonly __input?: TIn;
  /** Phantom type marker; never set at runtime. */
  readonly __output?: TOut;
}

/** What a step accepts as its operation. */
export type StepOperation =
  OperationDefinition | OperationRef<unknown, unknown>;

/** Input a step builds for an operation definition: what the client accepts. */
export type StepInputOf<D extends OperationDefinition> = z.input<D['input']>;

/** Output a step receives from an operation definition: the parsed output. */
export type StepOutputOf<D extends OperationDefinition> = z.output<D['output']>;

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
  /**
   * Compensation operation; null for steps after the pivot and for read-only
   * steps, which have nothing to undo and are skipped while compensating.
   */
  readonly compensationOperationId: string | null;
  readonly afterPivot: boolean;
  /**
   * Contract of the operation, when the step was declared with one. Used by
   * the engine to check idempotency and time budgets at startup.
   */
  readonly definition?: OperationDefinition;
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
  readonly operation: StepOperation;
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

  /** Adds the next step that calls the operation of a contract. */
  step<D extends OperationDefinition>(
    operation: D,
  ): StepConfig<TState, StepInputOf<D>, StepOutputOf<D>>;
  /** @deprecated Pass the `OperationDefinition` of the contract. */
  step<TNextIn, TNextOut>(
    operation: OperationRef<TNextIn, TNextOut>,
  ): StepConfig<TState, TNextIn, TNextOut>;
  step(operation: StepOperation): StepConfig<TState, unknown, unknown> {
    return this.flow.step(operation as OperationRef);
  }

  /** Marks the boundary: steps added after this call are never compensated. */
  pivot(): this {
    this.flow.markPivot();
    return this;
  }
}

/** Whether `operation` is a contract definition rather than a hand-written reference. */
function isDefinition(
  operation: StepOperation,
): operation is OperationDefinition {
  return 'idempotent' in operation && 'input' in operation;
}

/** Normalized view of a step operation. */
interface ResolvedOperation {
  readonly id: string;
  readonly compensatedBy: string | null;
  /** Whether the operation changes data. A hand-written reference is assumed to. */
  readonly mutating: boolean;
  readonly definition?: OperationDefinition;
}

function resolveStepOperation(operation: StepOperation): ResolvedOperation {
  if (isDefinition(operation)) {
    const { metadata } = resolveOperation(operation);
    return {
      id: operation.id,
      compensatedBy: compensationOf(metadata),
      mutating: metadata.mutating,
      definition: operation,
    };
  }
  const { compensatedBy } = operation;
  return {
    id: operation.id,
    compensatedBy:
      compensatedBy === null || compensatedBy === Compensation.None
        ? null
        : compensatedBy,
    mutating: true,
  };
}

/**
 * Fluent builder used inside `SagaDefinition.define`. Steps declared before
 * `pivot()` are compensable; steps declared after it are not.
 */
export class SagaFlow<TState> {
  private readonly drafts: StepDraft<TState>[] = [];
  private pivotIndex: number | null = null;

  /**
   * Adds a step that calls the operation of a contract. Its compensation is
   * the `compensatedBy` of the contract; `Compensation.None` and read-only
   * operations have none. The input and output types come from its schemas.
   */
  step<D extends OperationDefinition>(
    operation: D,
  ): StepConfig<TState, StepInputOf<D>, StepOutputOf<D>>;
  /** @deprecated Pass the `OperationDefinition` of the contract. */
  step<TIn, TOut>(
    operation: OperationRef<TIn, TOut>,
  ): StepConfig<TState, TIn, TOut>;
  step(operation: StepOperation): StepConfig<TState, unknown, unknown> {
    const draft: StepDraft<TState> = { operation };
    this.drafts.push(draft);
    return new StepConfig<TState, unknown, unknown>(this, draft);
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
   * Validates the flow and freezes it into a compiled saga:
   * - a step before the pivot that changes data declares a compensation;
   * - a step after the pivot is never compensated, and when it comes from a
   *   contract, that operation is idempotent (it is retried until it completes).
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
      const operation = resolveStepOperation(draft.operation);
      if (
        !afterPivot &&
        operation.mutating &&
        operation.compensatedBy === null
      ) {
        throw new SagaError(
          SagaErrorCode.MissingCompensation,
          `Step ${index} (${operation.id}) of saga "${type}" runs before the pivot and has no compensation`,
        );
      }
      if (afterPivot && operation.definition?.idempotent === false) {
        throw new SagaError(
          SagaErrorCode.InvalidDefinition,
          `Step ${index} (${operation.id}) of saga "${type}" runs after the pivot and is not idempotent`,
        );
      }
      return {
        index,
        operationId: operation.id,
        compensationOperationId: afterPivot ? null : operation.compensatedBy,
        afterPivot,
        ...(operation.definition !== undefined && {
          definition: operation.definition,
        }),
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
