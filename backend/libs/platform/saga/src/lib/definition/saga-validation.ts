import {
  compensationOf,
  defaultCallBudgetMs,
  resolveOperation,
  type ContractRegistry,
  type OperationMetadata,
} from '@platform/internal-api';
import type { CompiledSaga, CompiledStep } from './saga-flow.js';

/** Kind of problem found when the engine validates its sagas at startup. */
export enum SagaDefinitionIssueCode {
  /** The registry key differs from the `type` the definition declares. */
  TypeMismatch = 'type-mismatch',
  /** The step operation is not in the contract registry. */
  UnregisteredOperation = 'unregistered-operation',
  /** The compensation operation is not in the contract registry. */
  UnregisteredCompensation = 'unregistered-compensation',
  /** The compensation of the step differs from the `compensatedBy` of the contract. */
  CompensationMismatch = 'compensation-mismatch',
  /** A step before the pivot changes data and its contract declares no compensation. */
  MissingCompensation = 'missing-compensation',
  /** A step after the pivot is not idempotent, so it cannot be retried until it completes. */
  NotIdempotentAfterPivot = 'not-idempotent-after-pivot',
  /** A compensation is not idempotent, so it cannot be retried with the same key. */
  NotIdempotentCompensation = 'not-idempotent-compensation',
  /** The default budget of a call (attempts and backoffs) exceeds `maxStepDurationMs`. */
  StepBudgetExceeded = 'step-budget-exceeded',
}

/** Problem found in a saga definition. */
export interface SagaDefinitionIssue {
  readonly code: SagaDefinitionIssueCode;
  readonly sagaType: string;
  readonly stepIndex?: number;
  readonly operationId?: string;
  readonly message: string;
}

/** What the validation checks against. */
export interface SagaValidationContext {
  /**
   * Operations the engine can call. When absent, only what the step contracts
   * say is checked: the compensation operations cannot be looked up.
   */
  readonly contracts?: ContractRegistry;
  /** Budget of each step call. */
  readonly maxStepDurationMs: number;
}

/**
 * Checks compiled sagas against the contracts:
 * - every operation and every compensation is registered;
 * - the compensation of each step is the `compensatedBy` of its contract;
 * - steps after the pivot and compensations are idempotent;
 * - the default call budget of each operation fits in `maxStepDurationMs`.
 * Returns an empty array when everything is valid.
 */
export function validateSagas(
  sagas: readonly CompiledSaga<unknown>[],
  context: SagaValidationContext,
): SagaDefinitionIssue[] {
  const issues: SagaDefinitionIssue[] = [];
  for (const saga of sagas) {
    for (const step of saga.steps) {
      issues.push(...validateStep(saga.type, step, context));
    }
  }
  return issues;
}

function validateStep(
  sagaType: string,
  step: CompiledStep<unknown>,
  { contracts, maxStepDurationMs }: SagaValidationContext,
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
  const checkBudget = (operationId: string, metadata: OperationMetadata) => {
    const budget = defaultCallBudgetMs(metadata);
    if (budget > maxStepDurationMs) {
      at(
        SagaDefinitionIssueCode.StepBudgetExceeded,
        operationId,
        `a call can take ${budget} ms (attempts and backoffs), above maxStepDurationMs (${maxStepDurationMs} ms)`,
      );
    }
  };

  const registered = contracts?.get(step.operationId);
  if (contracts !== undefined && registered === undefined) {
    at(
      SagaDefinitionIssueCode.UnregisteredOperation,
      step.operationId,
      'the operation is not registered',
    );
  }
  const metadata =
    registered?.metadata ??
    (step.definition === undefined
      ? undefined
      : resolveOperation(step.definition).metadata);

  if (metadata !== undefined) {
    if (step.afterPivot && !metadata.idempotent) {
      at(
        SagaDefinitionIssueCode.NotIdempotentAfterPivot,
        step.operationId,
        'runs after the pivot and is not idempotent',
      );
    }
    if (!step.afterPivot) {
      const expected = compensationOf(metadata);
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
  }

  const compensationId = step.compensationOperationId;
  if (compensationId !== null && contracts !== undefined) {
    const compensation = contracts.get(compensationId);
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
