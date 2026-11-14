import type { ContractRegistry } from '@platform/internal-api';
import type { CallOutcome, Deadline } from '@platform/primitives';
import type { SagaCallContext } from './model.js';

/** Per-call values handed to the invoker by the engine. */
export interface InvokeOptions {
  /** Aborted when the step budget runs out. */
  readonly signal?: AbortSignal;
  /**
   * Budget of this step. The invoker passes it to the client, which cuts its
   * attempts to it and sends the rest to the server as the idempotency lease.
   */
  readonly deadline?: Deadline;
  /**
   * Call context persisted with the saga instance (tenant, actor,
   * traceparent). It is the same on every attempt and after recovery, so the
   * callee scopes the idempotency key identically.
   */
  readonly context?: SagaCallContext;
}

/**
 * Port that calls an operation of another service. Retries within the step
 * budget belong to the implementation; the saga reacts to the final outcome.
 * A thrown error is classified with `classifyFailure`.
 */
export interface OperationInvoker {
  /**
   * Operations this invoker can call. When present, `SagaEngine` validates
   * its sagas against them at startup.
   */
  readonly contracts?: ContractRegistry;
  /** Calls `operationId` with `idempotencyKey`, which the callee must honour. */
  invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options?: InvokeOptions,
  ): Promise<CallOutcome<unknown>>;
}
