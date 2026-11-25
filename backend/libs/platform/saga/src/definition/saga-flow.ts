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
 * Constructor fluido que se usa dentro de `SagaDefinition.define`. Los pasos
 * declarados antes de `pivot()` son compensables; los declarados después, no.
 */
export class SagaFlow<TState> {
  private readonly drafts: StepDraft<TState>[] = [];
  private pivotIndex: number | null = null;

  constructor(private readonly resolver: OperationResolver) {}

  /**
   * Agrega un paso que llama a la operación de un contrato. Su compensación es
   * el `compensatedBy` del contrato; `Compensation.None` y las operaciones de
   * solo lectura no tienen. Los tipos de entrada y salida salen de sus esquemas.
   */
  step<D extends OperationDefinition>(
    operation: D,
  ): StepConfig<TState, StepInputOf<D>, StepOutputOf<D>> {
    const draft: StepDraft<TState> = { operation };
    this.drafts.push(draft);
    return new StepConfig<TState, StepInputOf<D>, StepOutputOf<D>>(this, draft);
  }

  /**
   * Registra la frontera del pivote antes del siguiente paso.
   * @internal Lo llama `StepConfig.pivot()`.
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
   * Valida el flujo y lo congela en una saga compilada:
   * - un paso anterior al pivote que cambia datos declara una compensación;
   * - un paso posterior al pivote nunca se compensa y su operación es
   *   idempotente (se reintenta hasta completarse).
   * @internal Lo llama `SagaDefinition.build()`.
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
