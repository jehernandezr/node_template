import type { OperationDefinition } from '@contracts/platform';
import type { OperationResolver } from '@platform/internal-api';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { CompiledSaga } from './compiled-saga.js';
import type { CompiledStep } from './compiled-step.js';
import type { ForwardEntry } from './forward-entry.js';
import { StepConfig } from './step-config.js';
import type { StepDraft } from './step-draft.js';
import type { StepInputOf, StepOutputOf } from './step-types.js';

/**
 * Fluent builder used inside `SagaDefinition.define`. Steps
 * declared before `pivot()` are compensable; those declared after are not.
 */
export class SagaFlow<TState> {
  private readonly drafts: StepDraft<TState>[] = [];
  private pivotIndex: number | null = null;

  constructor(private readonly resolver: OperationResolver) {}

  /**
   * Adds a step that calls a contract's operation. Its compensation is
   * the contract's `compensatedBy`; `Compensation.None` and read-only
   * operations have none. The input and output types come from their schemas.
   */
  step<D extends OperationDefinition>(
    operation: D,
  ): StepConfig<TState, StepInputOf<D>, StepOutputOf<D>> {
    const draft: StepDraft<TState> = { operation };
    this.drafts.push(draft);
    return new StepConfig<TState, StepInputOf<D>, StepOutputOf<D>>(this, draft);
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
   * - a step after the pivot is never compensated and its operation is
   *   idempotent (it is retried until it completes).
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
      const operation = draft.operation;
      const { metadata } = this.resolver.resolve(operation);
      const compensatedBy = metadata.compensation();
      if (!afterPivot && metadata.mutating && compensatedBy === null) {
        throw new SagaError(
          SagaErrorCode.MissingCompensation,
          `Step ${index} (${operation.id}) of saga "${type}" runs before the pivot and has no compensation`,
        );
      }
      if (afterPivot && !operation.idempotent) {
        throw new SagaError(
          SagaErrorCode.InvalidDefinition,
          `Step ${index} (${operation.id}) of saga "${type}" runs after the pivot and is not idempotent`,
        );
      }
      return {
        index,
        operationId: operation.id,
        compensationOperationId: afterPivot ? null : compensatedBy,
        afterPivot,
        definition: operation,
        progressReasons: new Set(draft.progressReasons ?? []),
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
