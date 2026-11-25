import type { ContractRegistry } from '@platform/internal-api';
import type { CallOutcome } from '@platform/primitives';
import type { InvokeOptions } from './invoke-options.js';

/**
 * Port that calls an operation of another service. Retries within
 * the step budget belong to the implementation; the saga reacts to the
 * final result. A thrown error is classified with `FailureClassifier`.
 */
export abstract class OperationInvoker {
  /**
   * Operations this invoker can call. When present, the saga registry
   * validates the sagas' operations against them at startup.
   */
  get contracts(): ContractRegistry | undefined {
    return undefined;
  }

  /** Calls `operationId` with `idempotencyKey`, which the participant must honor. */
  abstract invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options?: InvokeOptions,
  ): Promise<CallOutcome<unknown>>;
}
