import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

/** Error codes of the saga library: the `PLATFORM.SAGA.*` values of the catalog. */
export type SagaErrorCode =
  | PlatformErrorCode.SagaNotFound
  | PlatformErrorCode.SagaDuplicateSaga
  | PlatformErrorCode.SagaUnknownDefinition
  | PlatformErrorCode.SagaInvalidDefinition
  | PlatformErrorCode.SagaInvalidConfiguration
  | PlatformErrorCode.SagaInvalidState
  | PlatformErrorCode.SagaMissingCompensation
  | PlatformErrorCode.SagaConcurrentModification
  | PlatformErrorCode.SagaLeaseNotAcquired
  | PlatformErrorCode.SagaLeaseLost
  | PlatformErrorCode.SagaTransientFailure
  | PlatformErrorCode.SagaProtocolViolation
  | PlatformErrorCode.SagaUncertainOutcome
  | PlatformErrorCode.SagaStateUpdateFailed
  | PlatformErrorCode.SagaInputBuildFailed
  | PlatformErrorCode.SagaIdempotencyKeyConflict
  | PlatformErrorCode.SagaDeadlineExceeded;

/** Codes that mean another run got in the way; trying again later can succeed. */
const CONTENTION: ReadonlySet<SagaErrorCode> = new Set<SagaErrorCode>([
  PlatformErrorCode.SagaConcurrentModification,
  PlatformErrorCode.SagaLeaseNotAcquired,
  PlatformErrorCode.SagaLeaseLost,
]);

/**
 * Base error of the saga library. Carries a stable `code`. Contention is
 * transient; everything else is permanent, since repeating the same call
 * against the same instance gives the same answer.
 */
export class SagaError extends PlatformError {
  override readonly code: SagaErrorCode;
  readonly failureKind: FailureKind;

  constructor(
    code: SagaErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    const contention = CONTENTION.has(code);
    super(message, {
      retryable: contention,
      ...(details !== undefined && { details }),
    });
    this.code = code;
    this.failureKind = contention
      ? FailureKind.Transient
      : FailureKind.Permanent;
  }
}
