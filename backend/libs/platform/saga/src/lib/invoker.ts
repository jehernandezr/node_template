/** Kind of outcome returned by an operation call. */
export enum InvokeKind {
  /** The operation applied and produced `output`. */
  Success = 'success',
  /** Definitive: the operation did not apply. */
  BusinessError = 'business_error',
  /** Unknown: the operation may or may not have applied. */
  TransientFailure = 'transient_failure',
  /** The callee broke the contract; the outcome is treated as unknown. */
  ProtocolViolation = 'protocol_violation',
}

/** Outcome of one operation call, as reported by the client. */
export type InvokeResult =
  | { readonly kind: InvokeKind.Success; readonly output: unknown }
  | { readonly kind: InvokeKind.BusinessError; readonly code: string }
  | { readonly kind: InvokeKind.TransientFailure; readonly reason: string }
  | { readonly kind: InvokeKind.ProtocolViolation; readonly reason: string };

/** Per-call options. `signal` is aborted when the engine gives up on the call. */
export interface InvokeOptions {
  readonly signal?: AbortSignal;
}

/**
 * Port that calls an operation of another service. Retries and timeouts
 * belong to the implementation; the saga only reacts to the final outcome.
 */
export interface OperationInvoker {
  /** Calls `operationId` with `idempotencyKey`, which the callee must honour. */
  invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options?: InvokeOptions,
  ): Promise<InvokeResult>;
}
