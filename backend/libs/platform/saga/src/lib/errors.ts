/** Stable error codes of the saga library, format `PLATFORM.SAGA.<ERROR>`. */
export enum SagaErrorCode {
  NotFound = 'PLATFORM.SAGA.NOT_FOUND',
  DuplicateSaga = 'PLATFORM.SAGA.DUPLICATE_SAGA',
  UnknownDefinition = 'PLATFORM.SAGA.UNKNOWN_DEFINITION',
  InvalidDefinition = 'PLATFORM.SAGA.INVALID_DEFINITION',
  InvalidConfiguration = 'PLATFORM.SAGA.INVALID_CONFIGURATION',
  InvalidState = 'PLATFORM.SAGA.INVALID_STATE',
  MissingCompensation = 'PLATFORM.SAGA.MISSING_COMPENSATION',
  ConcurrentModification = 'PLATFORM.SAGA.CONCURRENT_MODIFICATION',
  LeaseNotAcquired = 'PLATFORM.SAGA.LEASE_NOT_ACQUIRED',
  LeaseLost = 'PLATFORM.SAGA.LEASE_LOST',
  TransientFailure = 'PLATFORM.SAGA.TRANSIENT_FAILURE',
  ProtocolViolation = 'PLATFORM.SAGA.PROTOCOL_VIOLATION',
  StateUpdateFailed = 'PLATFORM.SAGA.STATE_UPDATE_FAILED',
  InputBuildFailed = 'PLATFORM.SAGA.INPUT_BUILD_FAILED',
  IdempotencyKeyConflict = 'PLATFORM.SAGA.IDEMPOTENCY_KEY_CONFLICT',
  DeadlineExceeded = 'PLATFORM.SAGA.DEADLINE_EXCEEDED',
  SimulatedCrash = 'PLATFORM.SAGA.SIMULATED_CRASH',
}

/** Base error of the saga library. Carries a stable `code`. */
export class SagaError extends Error {
  readonly code: SagaErrorCode;

  constructor(code: SagaErrorCode, message: string) {
    super(message);
    this.name = 'SagaError';
    this.code = code;
  }
}

/** Thrown by test hooks to emulate the death of the process running a saga. */
export class SimulatedCrash extends SagaError {
  constructor(detail: string) {
    super(SagaErrorCode.SimulatedCrash, `Simulated crash: ${detail}`);
    this.name = 'SimulatedCrash';
  }
}
