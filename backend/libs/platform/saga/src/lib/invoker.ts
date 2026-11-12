import {
  CallOutcome,
  CallOutcomeKind,
  type Deadline,
} from '@platform/primitives';
import type { SagaCallContext } from './model.js';

/**
 * Kind of outcome returned by a legacy invoker.
 * @deprecated Return a `CallOutcome` from `@platform/primitives` instead.
 */
export enum InvokeKind {
  Success = 'success',
  BusinessError = 'business_error',
  TransientFailure = 'transient_failure',
  ProtocolViolation = 'protocol_violation',
}

/**
 * Outcome of a legacy invoker.
 * @deprecated Return a `CallOutcome` from `@platform/primitives` instead.
 */
export type InvokeResult =
  | { readonly kind: InvokeKind.Success; readonly output: unknown }
  | { readonly kind: InvokeKind.BusinessError; readonly code: string }
  | { readonly kind: InvokeKind.TransientFailure; readonly reason: string }
  | { readonly kind: InvokeKind.ProtocolViolation; readonly reason: string };

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
  /** Calls `operationId` with `idempotencyKey`, which the callee must honour. */
  invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options?: InvokeOptions,
  ): Promise<CallOutcome<unknown> | InvokeResult>;
}

/** Reason of the protocol violation for an invoker result of unknown shape. */
export const INVALID_INVOKER_RESULT = 'invalid-invoker-result';

const OUTCOME_KINDS: ReadonlySet<unknown> = new Set(
  Object.values(CallOutcomeKind),
);

/** Converts what an invoker returned (a `CallOutcome` or a legacy `InvokeResult`) to a `CallOutcome`. */
export function toCallOutcome(result: unknown): CallOutcome<unknown> {
  if (typeof result !== 'object' || result === null) {
    return CallOutcome.protocolViolation(INVALID_INVOKER_RESULT);
  }
  const candidate = result as { kind?: unknown };
  // Both shapes use 'success'; a legacy success carries `output` instead of `value`.
  if (
    candidate.kind === InvokeKind.Success &&
    !('value' in candidate) &&
    'output' in candidate
  ) {
    return CallOutcome.success((candidate as { output: unknown }).output);
  }
  if (OUTCOME_KINDS.has(candidate.kind)) {
    return result as CallOutcome<unknown>;
  }
  const legacy = result as InvokeResult;
  switch (legacy.kind) {
    case InvokeKind.Success:
      return CallOutcome.success(legacy.output);
    case InvokeKind.BusinessError:
      return CallOutcome.businessError(legacy.code);
    case InvokeKind.TransientFailure:
      return CallOutcome.transientFailure(legacy.reason);
    case InvokeKind.ProtocolViolation:
      return CallOutcome.protocolViolation(legacy.reason);
    default:
      return CallOutcome.protocolViolation(INVALID_INVOKER_RESULT);
  }
}
