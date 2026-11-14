import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';

/**
 * Error codes of the saga library, format `PLATFORM.SAGA.<ERROR>`. Each value
 * is the `PlatformErrorCode` of the catalog, so the code is declared once in
 * `@contracts/platform`.
 */
export const SagaErrorCode = {
  NotFound: PlatformErrorCode.SagaNotFound,
  DuplicateSaga: PlatformErrorCode.SagaDuplicateSaga,
  UnknownDefinition: PlatformErrorCode.SagaUnknownDefinition,
  InvalidDefinition: PlatformErrorCode.SagaInvalidDefinition,
  InvalidConfiguration: PlatformErrorCode.SagaInvalidConfiguration,
  InvalidState: PlatformErrorCode.SagaInvalidState,
  MissingCompensation: PlatformErrorCode.SagaMissingCompensation,
  ConcurrentModification: PlatformErrorCode.SagaConcurrentModification,
  LeaseNotAcquired: PlatformErrorCode.SagaLeaseNotAcquired,
  LeaseLost: PlatformErrorCode.SagaLeaseLost,
  TransientFailure: PlatformErrorCode.SagaTransientFailure,
  ProtocolViolation: PlatformErrorCode.SagaProtocolViolation,
  /** A step call ended without knowing whether it applied (timeout or cancellation). */
  UncertainOutcome: PlatformErrorCode.SagaUncertainOutcome,
  StateUpdateFailed: PlatformErrorCode.SagaStateUpdateFailed,
  InputBuildFailed: PlatformErrorCode.SagaInputBuildFailed,
  IdempotencyKeyConflict: PlatformErrorCode.SagaIdempotencyKeyConflict,
  DeadlineExceeded: PlatformErrorCode.SagaDeadlineExceeded,
  SimulatedCrash: PlatformErrorCode.SagaSimulatedCrash,
} as const;

/** One of the {@link SagaErrorCode} values. */
export type SagaErrorCode = (typeof SagaErrorCode)[keyof typeof SagaErrorCode];

/** Codes that mean another run got in the way; trying again later can succeed. */
const RETRYABLE: ReadonlySet<SagaErrorCode> = new Set<SagaErrorCode>([
  SagaErrorCode.ConcurrentModification,
  SagaErrorCode.LeaseNotAcquired,
  SagaErrorCode.LeaseLost,
  SagaErrorCode.SimulatedCrash,
]);

/** Base error of the saga library. Carries a stable `code`. */
export class SagaError extends PlatformError {
  override readonly code: SagaErrorCode;

  constructor(
    code: SagaErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message, {
      retryable: RETRYABLE.has(code),
      ...(details !== undefined && { details }),
    });
    this.code = code;
  }
}

/** Thrown by test hooks to emulate the death of the process running a saga. */
export class SimulatedCrash extends SagaError {
  constructor(detail: string) {
    super(SagaErrorCode.SimulatedCrash, `Simulated crash: ${detail}`);
  }
}
