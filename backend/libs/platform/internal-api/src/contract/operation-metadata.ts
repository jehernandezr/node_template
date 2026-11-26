import {
  Compensation,
  PlatformErrorCode,
  type OperationRetryPolicy,
} from '@contracts/platform';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';

/** Fields an `OperationMetadata` is built from, taken from the `defineOperation` descriptor. */
export interface OperationMetadataInit {
  readonly id: string;
  readonly idempotent: boolean;
  readonly mutating: boolean;
  readonly errors: readonly string[];
  /** Id of the operation that reverts this one, or `Compensation.None`. */
  readonly compensatedBy?: string | Compensation;
  /** Required and non-empty when `compensatedBy` is `Compensation.None`. */
  readonly compensationReason?: string;
  readonly retry?: OperationRetryPolicy;
  readonly timeoutMs?: number;
}

/**
 * Immutable metadata of an operation. It gathers the effective retry,
 * timeout and compensation values so that neither the client, the registry nor
 * the sagas recompute them each on their own.
 */
export class OperationMetadata {
  /** Retries of an idempotent operation that does not declare its own. */
  static readonly DEFAULT_RETRY_POLICY = new RetryPolicy(
    3,
    100,
    2000,
    BackoffStrategy.EqualJitter,
  );

  /** Time of each attempt when the operation does not declare `timeoutMs`. */
  static readonly DEFAULT_TIMEOUT_MS = 5000;

  /**
   * Business code allowed in every operation without declaring it. The client and
   * the router respond with it to an input that breaks the contract.
   */
  static readonly INVALID_INPUT_CODE = PlatformErrorCode.ValidationInvalidInput;

  readonly id: string;
  readonly idempotent: boolean;
  readonly mutating: boolean;
  readonly errors: readonly string[];
  readonly compensatedBy?: string | Compensation;
  readonly compensationReason?: string;
  readonly retry?: OperationRetryPolicy;
  readonly timeoutMs?: number;

  constructor(init: OperationMetadataInit) {
    this.id = init.id;
    this.idempotent = init.idempotent;
    this.mutating = init.mutating;
    this.errors = Object.freeze([...init.errors]);
    if (init.compensatedBy !== undefined) {
      this.compensatedBy = init.compensatedBy;
    }
    if (init.compensationReason !== undefined) {
      this.compensationReason = init.compensationReason;
    }
    if (init.retry !== undefined) {
      this.retry = init.retry;
    }
    if (init.timeoutMs !== undefined) {
      this.timeoutMs = init.timeoutMs;
    }
    Object.freeze(this);
  }

  /**
   * Returns the service that owns an operation: the first segment of its id (`service.entity.operation.vN`).
   * @param operationId Operation id.
   * @returns The service name.
   */
  static serviceOf(operationId: string): string {
    return operationId.split('.')[0];
  }

  /**
   * Service that owns this operation.
   * @returns The service name.
   */
  service(): string {
    return OperationMetadata.serviceOf(this.id);
  }

  /**
   * Effective retries: what the operation declares on top of the defaults.
   * @returns The retry policy.
   */
  retryPolicy(): RetryPolicy {
    const base = OperationMetadata.DEFAULT_RETRY_POLICY;
    return new RetryPolicy(
      this.retry?.maxAttempts ?? base.maxAttempts,
      this.retry?.baseMs ?? base.baseMs,
      this.retry?.maxMs ?? base.maxMs,
      base.strategy,
    );
  }

  /**
   * Time of each attempt.
   * @returns The timeout in milliseconds.
   */
  attemptTimeoutMs(): number {
    return this.timeoutMs ?? OperationMetadata.DEFAULT_TIMEOUT_MS;
  }

  /**
   * Attempts the client can make. A non-idempotent operation has exactly one.
   * @returns The number of attempts.
   */
  attempts(): number {
    return this.idempotent ? Math.max(1, this.retryPolicy().maxAttempts) : 1;
  }

  /**
   * Default budget of a full call: all attempts plus the
   * longest wait between them. Used when the caller does not pass a `Deadline`.
   * @returns The budget in milliseconds.
   */
  callBudgetMs(): number {
    const attempts = this.attempts();
    return (
      attempts * this.attemptTimeoutMs() +
      (attempts - 1) * this.retryPolicy().maxMs
    );
  }

  /**
   * Id of the operation that reverts this one, or `null` if it has none: a
   * read-only operation or one declared with `Compensation.None`.
   * @returns The compensation id, or `null`.
   */
  compensation(): string | null {
    if (!this.mutating || this.compensatedBy === undefined) {
      return null;
    }
    return this.compensatedBy === Compensation.None ? null : this.compensatedBy;
  }

  /**
   * Business codes a handler or a transport can return for this operation.
   * @returns The codes.
   */
  allowedErrorCodes(): ReadonlySet<string> {
    return new Set([...this.errors, OperationMetadata.INVALID_INPUT_CODE]);
  }
}
