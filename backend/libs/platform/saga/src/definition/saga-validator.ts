import type {
  ContractRegistry,
  OperationMetadata,
  OperationResolver,
} from '@platform/internal-api';
import type { CompiledSaga } from './compiled-saga.js';
import type { CompiledStep } from './compiled-step.js';
import type { SagaDefinitionIssue } from './saga-definition-issue.js';
import { SagaDefinitionIssueCode } from './saga-definition-issue-code.enum.js';

/**
 * Checks the compiled sagas against the contracts:
 * - every operation and every compensation is registered;
 * - each step's compensation is its contract's `compensatedBy`;
 * - the steps after the pivot and the compensations are idempotent;
 * - the default budget of each operation fits in `maxStepDurationMs`.
 */
export class SagaValidator {
  /**
   * @param contracts Operations the engine can call. Without it only
   *   what the steps' contracts say is checked: the compensations cannot be looked up.
   */
  constructor(
    private readonly resolver: OperationResolver,
    private readonly maxStepDurationMs: number,
    private readonly contracts?: ContractRegistry,
  ) {}

  /** Returns the issues found; an empty array if everything is valid. */
  validate(sagas: readonly CompiledSaga<unknown>[]): SagaDefinitionIssue[] {
    return sagas.flatMap((saga) =>
      saga.steps.flatMap((step) => this.validateStep(saga.type, step)),
    );
  }

  private validateStep(
    sagaType: string,
    step: CompiledStep<unknown>,
  ): SagaDefinitionIssue[] {
    const issues: SagaDefinitionIssue[] = [];
    const at = (
      code: SagaDefinitionIssueCode,
      operationId: string,
      message: string,
    ): void => {
      issues.push({
        code,
        sagaType,
        stepIndex: step.index,
        operationId,
        message: `Saga "${sagaType}", step ${step.index} (${operationId}): ${message}`,
      });
    };
    const checkBudget = (
      operationId: string,
      metadata: OperationMetadata,
    ): void => {
      const budget = metadata.callBudgetMs();
      if (budget > this.maxStepDurationMs) {
        at(
          SagaDefinitionIssueCode.StepBudgetExceeded,
          operationId,
          `a call can take ${budget} ms (attempts and backoffs), above maxStepDurationMs (${this.maxStepDurationMs} ms)`,
        );
      }
    };

    const registered = this.contracts?.get(step.operationId);
    if (this.contracts !== undefined && registered === undefined) {
      at(
        SagaDefinitionIssueCode.UnregisteredOperation,
        step.operationId,
        'the operation is not registered',
      );
    }
    const metadata =
      registered?.metadata ?? this.resolver.resolve(step.definition).metadata;

    if (step.afterPivot && !metadata.idempotent) {
      at(
        SagaDefinitionIssueCode.NotIdempotentAfterPivot,
        step.operationId,
        'runs after the pivot and is not idempotent',
      );
    }
    if (!step.afterPivot) {
      const expected = metadata.compensation();
      if (metadata.mutating && expected === null) {
        at(
          SagaDefinitionIssueCode.MissingCompensation,
          step.operationId,
          'runs before the pivot and its contract declares no compensation',
        );
      } else if (expected !== step.compensationOperationId) {
        at(
          SagaDefinitionIssueCode.CompensationMismatch,
          step.operationId,
          `is compensated by "${step.compensationOperationId}", but its contract says "${expected}"`,
        );
      }
    }
    checkBudget(step.operationId, metadata);

    const compensationId = step.compensationOperationId;
    if (compensationId !== null && this.contracts !== undefined) {
      const compensation = this.contracts.get(compensationId);
      if (compensation === undefined) {
        at(
          SagaDefinitionIssueCode.UnregisteredCompensation,
          compensationId,
          'the compensation is not registered',
        );
      } else {
        if (!compensation.metadata.idempotent) {
          at(
            SagaDefinitionIssueCode.NotIdempotentCompensation,
            compensationId,
            'the compensation is not idempotent',
          );
        }
        checkBudget(compensationId, compensation.metadata);
      }
    }
    return issues;
  }
}
